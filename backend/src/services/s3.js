import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAwsCredentials, getAwsEnv } from './awsConfig.js';

const aws = getAwsEnv();
const s3 = new S3Client({
  region: aws.region,
  credentials: getAwsCredentials(),
});

export const uploadToS3 = (key, buffer, contentType) =>
  s3.send(new PutObjectCommand({
    Bucket:      aws.bucket,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  }));

export const getPresignedUrl = (key) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: aws.bucket, Key: key }), { expiresIn: 3600 });
