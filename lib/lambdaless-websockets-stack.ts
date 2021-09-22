import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as events from "@aws-cdk/aws-events";
import * as eventsTargets from "@aws-cdk/aws-events-targets";
import * as cdk from "@aws-cdk/core";
import { EventBus } from "./event-bus";
import { TestEventPatternAPI } from "./test-event-pattern-api";
import { WebSocketAPI } from "./websocket-api";

export class LambdaLessWebSocketsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dataTable = new dynamodb.Table(this, "connectionsTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const eventBus = new EventBus(this, "eventBus");
    const testEventPatternAPI = new TestEventPatternAPI(
      this,
      "testEventPatternAPI"
    );

    const webSocketAPI = new WebSocketAPI(this, "webSocketAPI", {
      dataTable: dataTable,
      testEventPatternAPI: testEventPatternAPI.api
    });

    eventBus.rule.addTarget(
      new eventsTargets.SfnStateMachine(webSocketAPI.stateMachine, {
        input: events.RuleTargetInput.fromObject({
          actionType: "event",
          event: events.EventField.fromPath("$")
        })
      })
    );
  }
}
