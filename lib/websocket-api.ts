import * as apigw from "@aws-cdk/aws-apigateway";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as sfnTasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as cdk from "@aws-cdk/core";

interface WebSocketAPIProps {
  dataTable: dynamodb.Table;
  testEventPatternAPI: apigw.RestApi;
}

export class WebSocketAPI extends cdk.Construct {
  public api: apigwv2.IWebSocketApi;
  public stateMachine: sfn.StateMachine;

  constructor(
    scope: cdk.Construct,
    id: string,
    { dataTable, testEventPatternAPI }: WebSocketAPIProps
  ) {
    super(scope, id);

    this.api = new apigwv2.WebSocketApi(this, "api");

    let stateMachineArn: string;
    const stateMachineArnLazyString = cdk.Lazy.string({
      produce: () => stateMachineArn
    });

    const integrationRole = new iam.Role(this, "integrationRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      inlinePolicies: {
        AllowSFNExecution: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["states:StartExecution"],
              resources: [stateMachineArnLazyString]
            })
          ]
        })
      }
    });

    const connectIntegration = new apigwv2.CfnIntegration(
      this,
      "sfnConnectIntegration",
      {
        apiId: this.api.apiId,
        integrationType: "AWS",
        connectionType: "INTERNET",
        // What is an invocation uri?
        integrationUri: `arn:aws:apigateway:${cdk.Aws.REGION}:states:action/StartExecution`,
        credentialsArn: integrationRole.roleArn,
        passthroughBehavior: "NEVER",
        integrationMethod: "POST",
        templateSelectionExpression: "\\$default",
        requestTemplates: {
          $default: JSON.stringify({
            input: JSON.stringify({
              connectionId: "$context.connectionId",
              actionType: "connect"
            }),
            stateMachineArn: stateMachineArnLazyString
          })
        }
      }
    );

    const connectIntegrationResponse = new apigwv2.CfnIntegrationResponse(
      this,
      "sfnConnectIntegrationResponse",
      {
        apiId: this.api.apiId,
        integrationId: connectIntegration.ref,
        integrationResponseKey: "$default",
        templateSelectionExpression: "\\$default",
        responseTemplates: {
          $default: JSON.stringify({ statusCode: 200 })
        }
      }
    );

    const connectRoute = new apigwv2.CfnRoute(this, "connectRoute", {
      apiId: this.api.apiId,
      authorizationType: "NONE",
      routeKey: "$connect",
      target: `integrations/${connectIntegration.ref}`,
      apiKeyRequired: false
    });

    const connectRouteResponse = new apigwv2.CfnRouteResponse(
      this,
      "connectRouteResponse",
      {
        apiId: this.api.apiId,
        routeId: connectRoute.ref,
        routeResponseKey: "$default"
      }
    );

    const disconnectIntegration = new apigwv2.CfnIntegration(
      this,
      "sfnDisconnectIntegration",
      {
        apiId: this.api.apiId,
        integrationType: "AWS",
        connectionType: "INTERNET",
        // What is an invocation uri?
        integrationUri: `arn:aws:apigateway:${cdk.Aws.REGION}:states:action/StartExecution`,
        credentialsArn: integrationRole.roleArn,
        passthroughBehavior: "NEVER",
        integrationMethod: "POST",
        templateSelectionExpression: "\\$default",
        requestTemplates: {
          $default: JSON.stringify({
            input: JSON.stringify({
              connectionId: "$context.connectionId",
              actionType: "disconnect"
            }),
            stateMachineArn: stateMachineArnLazyString
          })
        }
      }
    );

    const disconnectIntegrationResponse = new apigwv2.CfnIntegrationResponse(
      this,
      "sfnDisconnectIntegrationResponse",
      {
        apiId: this.api.apiId,
        integrationId: disconnectIntegration.ref,
        integrationResponseKey: "$default",
        templateSelectionExpression: "\\$default",
        responseTemplates: {
          $default: JSON.stringify({ statusCode: 200 })
        }
      }
    );

    const disconnectRoute = new apigwv2.CfnRoute(this, "disconnectRoute", {
      apiId: this.api.apiId,
      authorizationType: "NONE",
      routeKey: "$disconnect",
      target: `integrations/${disconnectIntegration.ref}`,
      apiKeyRequired: false
    });

    const disconnectRouteResponse = new apigwv2.CfnRouteResponse(
      this,
      "disconnectRouteResponse",
      {
        apiId: this.api.apiId,
        routeId: disconnectRoute.ref,
        routeResponseKey: "$default"
      }
    );

    const updatePatternIntegration = new apigwv2.CfnIntegration(
      this,
      "sfnUpdatePatternIntegration",
      {
        apiId: this.api.apiId,
        integrationType: "AWS",
        connectionType: "INTERNET",
        // What is an invocation uri?
        integrationUri: `arn:aws:apigateway:${cdk.Aws.REGION}:states:action/StartExecution`,
        credentialsArn: integrationRole.roleArn,
        passthroughBehavior: "NEVER",
        integrationMethod: "POST",
        templateSelectionExpression: "\\$default",
        requestTemplates: {
          $default: JSON.stringify({
            stateMachineArn: stateMachineArnLazyString,
            input: JSON.stringify({
              actionType: "updatePattern",
              // I had to encode to base64, otherwise the APIGW would not parse the input.
              pattern: "$util.base64Encode($input.json('$.pattern'))"
            })
          })
        }
      }
    );

    const updatePatternResponse = new apigwv2.CfnIntegrationResponse(
      this,
      "cfnUpdatePatternIntegrationResponse",
      {
        apiId: this.api.apiId,
        integrationId: updatePatternIntegration.ref,
        integrationResponseKey: "$default"
      }
    );

    const updatePatternRoute = new apigwv2.CfnRoute(
      this,
      "updatePatternRoute",
      {
        apiId: this.api.apiId,
        authorizationType: "NONE",
        routeKey: "pattern",
        target: `integrations/${updatePatternIntegration.ref}`,
        apiKeyRequired: false
      }
    );

    const updatePatternRouteResponse = new apigwv2.CfnRouteResponse(
      this,
      "updatePatternIntegrationRouteResponse",
      {
        apiId: this.api.apiId,
        routeId: updatePatternRoute.ref,
        routeResponseKey: "$default"
      }
    );

    const apiStage = new apigwv2.WebSocketStage(this, "this.apiStage", {
      stageName: "dev",
      webSocketApi: this.api,
      autoDeploy: true
    });

    // --- State Machine --- //

    const onConnectionTask = new sfnTasks.DynamoPutItem(this, "onConnection", {
      item: {
        pk: sfnTasks.DynamoAttributeValue.fromString("client"),
        connectionId: sfnTasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$.connectionId")
        )
      },
      table: dataTable,
      inputPath: "$",
      outputPath: sfn.JsonPath.DISCARD
    });

    const onDisconnectTask = new sfnTasks.DynamoDeleteItem(
      this,
      "onDisconnect",
      {
        key: {
          pk: sfnTasks.DynamoAttributeValue.fromString("client")
        },
        table: dataTable,
        expressionAttributeNames: { "#pk": "pk" },
        conditionExpression: "attribute_exists(#pk)"
      }
    );

    const onUpdatePatternTask = new sfnTasks.DynamoUpdateItem(
      this,
      "onUpdatePattern",
      {
        table: dataTable,
        key: {
          pk: sfnTasks.DynamoAttributeValue.fromString("client")
        },
        conditionExpression: "attribute_exists(#pk)",
        expressionAttributeNames: {
          "#pk": "pk",
          "#pattern": "pattern"
        },
        expressionAttributeValues: {
          ":pattern": sfnTasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt("$.pattern")
          )
        },
        updateExpression: "SET #pattern = :pattern"
      }
    );

    const getEventPatternTask = new sfnTasks.DynamoGetItem(
      this,
      "getEventPattern",
      {
        key: {
          pk: sfnTasks.DynamoAttributeValue.fromString("client")
        },
        table: dataTable,
        resultSelector: {
          pattern: sfn.JsonPath.stringAt("$.Item.pattern.S"),
          connectionId: sfn.JsonPath.stringAt("$.Item.connectionId.S")
        },
        resultPath: sfn.JsonPath.stringAt("$.getEventPatternResult")
      }
    );

    const router = new sfn.Choice(this, "router", {
      inputPath: "$"
    });

    router.when(
      sfn.Condition.stringEquals("$.actionType", "connect"),
      onConnectionTask
    );

    router.when(
      sfn.Condition.stringEquals("$.actionType", "disconnect"),
      onDisconnectTask
    );

    router.when(
      sfn.Condition.stringEquals("$.actionType", "updatePattern"),
      onUpdatePatternTask
    );

    const prepareDataStep = new sfn.Pass(this, "prepareData", {
      inputPath: "$",
      parameters: {
        event: sfn.JsonPath.stringAt("$.event"),
        connectionId: sfn.JsonPath.stringAt(
          "$.getEventPatternResult.connectionId"
        ),
        pattern: sfn.JsonPath.stringAt("$.getEventPatternResult.pattern")
      },
      outputPath: "$"
    });

    const evaluateEventAgainstPatternTask =
      new sfnTasks.CallApiGatewayRestApiEndpoint(
        this,
        "evaluateEventAgainstPatternTask",
        {
          api: testEventPatternAPI,
          method: sfnTasks.HttpMethod.POST,
          apiPath: "/",
          stageName: "prod",
          requestBody: sfn.TaskInput.fromObject({
            Event: sfn.JsonPath.stringAt("$.event"),
            EventPattern: sfn.JsonPath.stringAt("$.pattern")
          }),
          resultSelector: {
            matches: sfn.JsonPath.stringAt("$.ResponseBody.Result")
          },
          resultPath: "$.evaluationResult"
        }
      );

    const shouldSentEvent = new sfn.Choice(this, "shouldSentEvent");

    /**
     * Using custom state since the native `CallXX` does not handle the `States.Format` within the `Path` really well.
     */
    const sendEventToSubscriberTask = new sfn.CustomState(
      this,
      "sendEventToSubscriber",
      {
        stateJson: {
          End: true,
          Type: "Task",
          Resource: "arn:aws:states:::apigateway:invoke",
          Parameters: {
            ApiEndpoint: `${this.api.apiId}.execute-api.us-east-1.amazonaws.com`,
            Method: "POST",
            Stage: "dev",
            "Path.$": "States.Format('/@connections/{}', $.connectionId)",
            "RequestBody.$": "$.event",
            AuthType: "IAM_ROLE"
          }
        }
      }
    );

    const onEvent = getEventPatternTask
      .next(prepareDataStep)
      .next(evaluateEventAgainstPatternTask)
      .next(
        shouldSentEvent
          .when(
            sfn.Condition.and(
              sfn.Condition.isPresent(
                sfn.JsonPath.stringAt("$.evaluationResult.matches")
              ),
              sfn.Condition.booleanEquals(
                sfn.JsonPath.stringAt("$.evaluationResult.matches"),
                true
              )
            ),
            sendEventToSubscriberTask
          )
          .otherwise(new sfn.Succeed(this, "skipSending"))
      );

    router.when(sfn.Condition.stringEquals("$.actionType", "event"), onEvent);

    this.stateMachine = new sfn.StateMachine(this, "wsAPIStateMachine", {
      definition: router
    });
    stateMachineArn = this.stateMachine.stateMachineArn;

    this.stateMachine.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:ManageConnections"],
        resources: [
          `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${this.api.apiId}/dev/POST/@connections/{connectionId}`
        ]
      })
    );

    new cdk.CfnOutput(this, "webSocketAPIurl", {
      value: apiStage.url
    });

    new cdk.CfnOutput(this, "webSocketAPICallbackURL", {
      value: apiStage.callbackUrl
    });
  }
}
