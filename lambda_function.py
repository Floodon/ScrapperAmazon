import pandas as pd
import os
import pyarrow.parquet as pq 
import boto3
from io import BytesIO
from io import StringIO

#If running on lambda
#s3 = boto3.client("s3")

#If running locally
s3 = boto3.client(
    "s3",
    aws_access_key_id='AKIAS3KWRQXFJVFHWMA4',
    aws_secret_access_key='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'
)


def lambda_handler(event, context):
    #If running on Lambda
    #bucket_name = event.Records[0].s3.bucket.name
    #object_key = event.Records[0].object.key

    #If running locally
    bucket_name = 'bucketamazonscrapper'
    object_key = '2022_2022_50_20221215_2022-12-15.19.4266.parquet.zst'

    file = s3.get_object(Bucket = bucket_name, Key = object_key)
    status = file.get("ResponseMetadata",{}).get("HTTPStatusCode")

    if status == 200:
        print("Successful S3 get_object response. Status - {status}")
        #Transforming the file into a pandas dataframe
        fileBody = file['Body'].read()
        data = BytesIO(fileBody)
        df = pd.read_parquet(data)
        #Editing columns
        df = df[['productID','productName','productCategory','productPrice','promotion','productPricePrevious','productRating','productDate','currentURL']]
        #Uploading the modified file on s3, à tester
        buffer = StringIO()
        df.to_parquet(buffer)
        s3_resource = boto3.resource('s3')
        s3_resource.Object(bucket_name,'df.parquet').put(Body = buffer.getValue())

    else:
        print("Unsuccessful S3 get_object response. Status - {status}")

lambda_handler(0,0)