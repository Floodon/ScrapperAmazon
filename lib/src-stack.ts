import { RemovalPolicy, Stack, StackProps, Environment, Duration } from "aws-cdk-lib";
import { AmazonLinuxGeneration, AmazonLinuxImage, Instance, InstanceClass, InstanceSize, InstanceType, Port, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { Cluster, ClusterType } from "@aws-cdk/aws-redshift-alpha";
import { Bucket, BucketEncryption, BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { readFileSync } from "fs";
import { resolve } from "path";
import { AssetCode, Runtime, Function } from "aws-cdk-lib/aws-lambda";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import * as targets from 'aws-cdk-lib/aws-events-targets';

export interface EnvironmentConfig extends Environment {
  pattern: string;
  envTag: string;
  stage: string;
  owner: string;
};

export class RedshiftDemoStack extends Stack {
  constructor(scope: Construct, id: string, reg: EnvironmentConfig, props: StackProps) {
    super(scope, id, props);

    const prefix = `${reg.pattern}-${reg.stage}-redshift`;

    const s3 = new Bucket(this, `${prefix}-data-ingest`, {
      bucketName: `${prefix}-data-ingest`,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL
    });

    const lambdaRole = new Role(this, `${prefix}-lambda-role`, {
      roleName: `${prefix}-lambda-role`,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    });
    s3.grantPut(lambdaRole);
    s3.grantRead(lambdaRole);

    const lambda = new Function(this, `${prefix}-scrapper`, {
      code: new AssetCode('lambda/bundle'),
      handler: 'main.handler',
      allowPublicSubnet: true,
      runtime: Runtime.NODEJS_16_X,
      memorySize: 1024,
      timeout: Duration.seconds(60),
      role: lambdaRole,
      environment: {
        BUCKET_NAME: s3.bucketName
      },
    });

    const redshiftRole = new Role(this, `${prefix}-redshift-role`, {
      roleName: `${prefix}-role`,
      assumedBy: new ServicePrincipal('redshift.amazonaws.com')
    });
    s3.grantRead(redshiftRole);

    const vpc = new Vpc(this, `${prefix}-vpc`, {
      vpcName: `${prefix}-vpc`,
      maxAzs: 1
    });

    const cluster = new Cluster(this, `${prefix}-cluster-demo`, {
      clusterName: `${prefix}-demo`,
      vpc: vpc,
      masterUser: {
        masterUsername: 'admin'
      },
      numberOfNodes: 2,
      clusterType: ClusterType.MULTI_NODE,
      removalPolicy: RemovalPolicy.DESTROY,
      roles: [redshiftRole]
    });

    const clusterSg = cluster.connections.securityGroups[0];
    clusterSg.addIngressRule(clusterSg, Port.allTcp(), "Allow internal access Redshift");

    const ec2 = new Instance(this, `${prefix}-psql`, {
      instanceName: `${prefix}-psql`,
      vpc: vpc,
      securityGroup: clusterSg,
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.SMALL),
      machineImage: new AmazonLinuxImage({ generation: AmazonLinuxGeneration.AMAZON_LINUX_2 }),
      role: new Role(this, `${prefix}-ec2-ssm`, { roleName: `${prefix}-ec2-ssm`, assumedBy: new ServicePrincipal('ec2.amazonaws.com'), managedPolicies: [{ managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore' }] })
    });

    const userData = readFileSync(resolve(__dirname, './user-data.sh'), 'utf8');
    ec2.addUserData(userData);

    const rule = new Rule(this, 'rule', {
      schedule: Schedule.rate(Duration.hours(1)),
    });
    rule.addTarget(new targets.LambdaFunction(lambda));
  }
}