import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getAwsCredentials, getAwsEnv } from './awsConfig.js';

const aws = getAwsEnv();
const sqs = new SQSClient({
  region: aws.region,
  credentials: getAwsCredentials(),
});

export const enqueueJob = async (jobId) => {
  const response = await sqs.send(new SendMessageCommand({
    QueueUrl:    aws.queueUrl,
    MessageBody: JSON.stringify({ jobId }),
  }));

  console.log(`Enqueued job ${jobId} to ${aws.queueUrl} (${response.MessageId})`);
  return response;
};
