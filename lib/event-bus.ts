import * as events from "@aws-cdk/aws-events";
import * as cdk from "@aws-cdk/core";

export class EventBus extends cdk.Construct {
  public rule: events.Rule;
  public bus: events.IEventBus;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.bus = new events.EventBus(this, "bus");

    this.rule = new events.Rule(this, "catchAllRule", {
      eventPattern: {
        version: ["0"]
      },
      eventBus: this.bus
    });

    new cdk.CfnOutput(this, "BusName", {
      value: this.bus.eventBusName
    });

    new cdk.CfnOutput(this, "BusArn", {
      value: this.bus.eventBusArn
    });
  }
}
