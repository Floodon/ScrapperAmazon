import pandas as pd
import os
import pyarrow.parquet as pq 
import boto3
from io import BytesIO

#If running on lambda
#s3 = boto3.client("s3")

#If running locally
s3 = boto3.client(
    "s3",
    aws_access_key_id=<AWS_ACCESS_KEY>,
    aws_secret_access_key=<AWS_SECRET_ACCESS_KEY>
)

s3_resource = boto3.resource(
    "s3",
    aws_access_key_id=<AWS_ACCESS_KEY>,
    aws_secret_access_key=<AWS_SECRET_ACCESS_KEY>
)


def lambda_handler(event, context):
    #If running on Lambda
    #bucket_in = event.Records[0].s3.bucket.name
    #object_key = event.Records[0].object.key
    #bucket_out = <BUCKET_NAME_OUT>

    #If running locally
    bucket_in = <BUCKET_NAME_IN>
    object_key = <OBJECT_KEY_IN>
    bucket_out = <BUCKET_NAME_OUT>

    file = s3.get_object(Bucket = bucket_in, Key = object_key)
    status = file.get("ResponseMetadata",{}).get("HTTPStatusCode")

    if status == 200:
        print("Successful S3 get_object response. Status - {status}")

        #Transforming the file into a pandas dataframe
        file_body = file['Body'].read()
        data = BytesIO(file_body)
        df = pd.read_parquet(data)

        #Editing columns
        df = df[['productID','productName','productCategory','productPrice','promotion','productPricePrevious','productRating','productDate','currentURL']]
        print("-Successful dataframe cleaning")

        #Uploading the modified file to s3
        buffer = BytesIO()
        df.to_parquet(path=buffer, compression='None')
        s3_resource.Object(bucket_out,'df.parquet').put(Body = buffer.getvalue())
        print("--Successful S3 put_object response. Status - {status}")
