#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { LambdaLessWebSocketsStack } from "../lib/lambdaless-websockets-stack";

const app = new cdk.App();
new LambdaLessWebSocketsStack(app, "lambdaLessWebSocketsStack");
