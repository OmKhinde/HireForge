import '../loadEnv.js';

const stripWrappingQuotes = (value = '') => value.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

export const getAwsEnv = () => ({
  region: stripWrappingQuotes(process.env.AWS_REGION || ''),
  bucket: stripWrappingQuotes(process.env.S3_BUCKET || ''),
  queueUrl: stripWrappingQuotes(process.env.SQS_QUEUE_URL || ''),
  accessKeyId: stripWrappingQuotes(process.env.AWS_ACCESS_KEY_ID || ''),
  secretAccessKey: stripWrappingQuotes(process.env.AWS_SECRET_ACCESS_KEY || ''),
});

export const getAwsCredentials = () => {
  const { accessKeyId, secretAccessKey } = getAwsEnv();

  if (!accessKeyId || !secretAccessKey) {
    return undefined;
  }

  return { accessKeyId, secretAccessKey };
};
