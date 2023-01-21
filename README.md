# AWS Stack to scrap Amazon data and analyze on Redshift

This project allows to scrap data from Amazon marketplace by country/category and store it in S3 bucket. Then it can be analyzed in the Redshift.

## Before to deploy
* make sure to bundle JS function
* launch your Docker container: CDK will need it to automatically bundle Python Lambda function during the deployment process.

## Useful commands
* `cdk diff`- compare deployed stack with current state
* `yarn bundle` - to bundle JS lambda function
* `cdk bootstrap && cdk deploy --concurrency 2 --require-approval never` - deploy this stack to your default AWS account/region
