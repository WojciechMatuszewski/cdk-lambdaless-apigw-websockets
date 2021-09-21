import * as apigw from "@aws-cdk/aws-apigateway";
import * as iam from "@aws-cdk/aws-iam";
import * as cdk from "@aws-cdk/core";

export class TestEventPatternAPI extends cdk.Construct {
  public api: apigw.RestApi;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.api = new apigw.RestApi(this, "api", {});

    const testEventPatternIntegrationRole = new iam.Role(
      this,
      "integrationRole",
      {
        assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
        inlinePolicies: {
          AllowSFNExecution: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["events:TestEventPattern"],
                // Sadly, only the `*` is supported for the resource-level permission.
                resources: ["*"]
              })
            ]
          })
        }
      }
    );

    const testEventPatternIntegration = new apigw.AwsIntegration({
      service: "events",
      action: "TestEventPattern",
      integrationHttpMethod: "POST",
      options: {
        credentialsRole: testEventPatternIntegrationRole,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        connectionType: apigw.ConnectionType.INTERNET,
        integrationResponses: [
          {
            statusCode: "200"
          }
        ],
        requestParameters: {
          "integration.request.header.Content-Type":
            "'application/x-amz-json-1.1'",
          "integration.request.header.X-Amz-Target":
            "'AWSEvents.TestEventPattern'"
        },
        requestTemplates: {
          "application/json": JSON.stringify({
            Event: "$util.escapeJavaScript($input.json('$.Event'))",
            EventPattern:
              "$util.escapeJavaScript($util.base64Decode($input.json('$.EventPattern')))"
          })
        }
      }
    });

    this.api.root.addMethod("POST", testEventPatternIntegration, {
      methodResponses: [
        {
          statusCode: "200"
        }
      ]
    });

    new cdk.CfnOutput(this, "testEventPatternAPIurl", {
      value: this.api.url
    });
  }
}
