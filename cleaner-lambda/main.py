import pandas as pd
import boto3
from io import StringIO, BytesIO

s3 = boto3.client("s3")
s3_resource = boto3.resource('s3')

def lambda_handler(event, context):

    bucket_in = event['Records'][0]['s3']['bucket']['name']
    object_key = event['Records'][0]['s3']['object']['key']
    bucket_out = "sin-d1-redshift-data-ingest"

    file = s3.get_object(Bucket = bucket_in, Key = object_key)
    status = file.get("ResponseMetadata",{}).get("HTTPStatusCode")

    if status == 200:
        print("Successful S3 get_object response. Status - {status}")

        #Transforming the file into a pandas dataframe
        file_body = file['Body'].read()
        data = BytesIO(file_body)
        df = pd.read_parquet(data, engine='fastparquet')

        #Editing columns
        df = df[['productID','productName','productCategory','productPrice','promotion','productPricePrevious','productRating','productDate','currentURL']]
        print("Successful dataframe cleaning")

        #Uploading the modified file to s3
        csv_buffer = StringIO()
        df.to_csv(csv_buffer)
        file_name = object_key.split('.')[0] + '.csv'
        s3_resource.Object(bucket_out, file_name).put(Body=csv_buffer.getvalue())
        print("Successful S3 put_object response")