# AWS Stack to scrap Amazon data and analyze on Redshift

This project allows to scrap data from Amazon marketplace by country/category and store it in S3 bucket. Then it can be analyzed in the Redshift.

## Useful commands
* `cdk diff`        compare deployed stack with current state
* `yarn bundle` to bundle lambda function
* `cdk bootstrap && cdk deploy --concurrency 2 --require-approval never` deploy this stack to your default AWS account/region