# Lambda-less AWS API Gateway WebSockets

Inspired by [this construct](https://github.com/boyney123/cdk-eventbridge-socket), I've decided to replicate it but put my little twist on the architecture - make it Lambda-less.

Why? Mainly for learning purposes. I've only consumed the _WebSockets_ part of the AWS API Gateway via Lambdas so far.

## Architecture

Here is a birds-eye view of the architecture that this repo deploys.

![architecture](./img/architecture.jpeg)

Please not that **this repo uses the _standard_ version of the _Step Functions_. One might swap to the _express_ version without much trouble**.

## Deployment

This repo uses _AWS CDK_ as the IaC tool. To deploy the infrastructure:

1. Ensure that you have your AWS credentials set-up.
2. Run `npm run bootstrap` if your environment is not _bootstrapped_ by _AWS CDK_ yet.
3. Run `npm run deploy`.

## Usage

1. Copy the `webSocketAPIurl` from the deployment outputs.
2. Connect to the `webSocketAPIurl`. There are many tools available to you to do that. One might use [`websocat`](https://github.com/vi/websocat) or [`Postman`](https://learning.postman.com/docs/sending-requests/supported-api-frameworks/websocket/)
3. Specify the pattern you want to filter the _EventBridge_ events on. This is done by sending a message with a `pattern` property.
   The `pattern` property corresponds to the (_EventBridge event pattern_)[https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html]

   Here is an example of a _catch-all_ event pattern.

```json
{ "action": "pattern", "pattern": { "version": ["0"] } }
```

4. Whenever an event is pushed to the _EventBridge_ bus created by this construct the event payload will be matched against the _pattern_ specified in the previous step. If the payload matches the _pattern_, the event payload will be sent to your _WebSocket_ connection.

## Learnings

- If you are not sure how the resource is structured and cannot export it (like in the case of APIGW v2, where the API definition cannot be exported), look into the network tab. You will most likely find useful resource information there.

* The _data mapping_ mechanism for various request parameters for the integration is very similar to the one you do while working with _APIGW Rest APIs_. First, you must enable the parameters you want to map using on the **route** level when you can map them on the **integration** level.
  Note that the **semantics of enabling the parameters are different**.
  Here, we enable a given parameter by specifying `Required: true | false` on that parameter.

- [The data mapping documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-data-mapping.html) lists various _data mapping expressions_ but the examples show only a small subsection of all possible mappings.
  According to the _CloudFormation_, only the `method.request.querystring | path | header` mapping is available in the _WebSocket_ context.

* Since the _APIGW WebSockets_ does not support the `IntegrationSubtype` _CloudFormation_ property, we need to use the _AWS_ integration type. This integration type works a bit differently than the _AWS_PROXY_ one.
  Instead of specifying the payload of the service call within the `RequestParameters` property, you will need to encode all of them within the `RequestTemplate`. **Be mindful about the `TemplateSelectionExpression` property as it dictates which `RequestTemplate` will be used for a given request**.

- When using **_direct service integrations_** be **mindful of headers that the service call expects**.
  Sometimes you have to specify the `X-Amz-Target`, sometimes it's the path that dictates the routing.

* The `TemplateSelectionExpression` is an expression that will dictate which of the `requestTemplate` is picked upon a request/response.
  The `\\$default` is a _catch-all_ and will evaluate to a `requestTemplate` with a `$default` key.
  This whole mechanism is very similar to creating a _MOCK_ type integration via APIGW. It allows you to develop responses based on the integration response.

- I made the `$connect` route work by **specifying the `Integration`, `IntegrationResponse`, and the `RouteResponse`**.
  **Keep in mind that the `IntegrationResponse` will not show in the AWS console**.

* There is **no easy way to configure _access logs_ / _execution logs_ for the APIGW v2**. You have to drill into L1 resources and monkey-patch properties.

- To invoke a given service operation directly, create a _REST APIGW_ and use direct integration. Then hook the newly created _APIGW_ to the state machine you are working with. Sadly I would not classify this method of creating an integration as very cost efficient.
