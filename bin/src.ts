#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EnvironmentConfig, RedshiftDemoStack } from '../lib/src-stack';

export const devEnv: EnvironmentConfig = {
  pattern: 'sin',
  envTag: 'dev',
  stage: 'd1',
  // account: CDK_DEFAULT_ACCOUNT,
  region: "eu-west-1",
  owner: 'development',
};

const app = new cdk.App();

new RedshiftDemoStack(app, `${devEnv.pattern}-${devEnv.stage}-redshift-demo`, devEnv, {
  description: 'CDK Redshift demo',
  env: devEnv
});

app.synth();