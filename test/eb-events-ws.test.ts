import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as EbEventsWs from '../lib/eb-events-ws-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new EbEventsWs.EbEventsWsStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
