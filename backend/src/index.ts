import { Handler } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { decode, verify } from 'jsonwebtoken';
import { promisify } from 'util';
import jwksRsa from 'jwks-rsa';
import OpenAI from 'openai';
import { ThreadCreateParams } from 'openai/resources/beta/threads/threads';
import { MessageCreateParams, TextDelta } from 'openai/resources/beta/threads/messages';

const jkws_uri = process.env.JWKS_URI || '';
const api_gw_endpoint = process.env.API_GW_ENDPOINT;
const issuer = process.env.ISSUER;
const audience = process.env.AUDIENCE || '';
const assistant_id = process.env.ASSISTANT_ID || '';
const region = process.env.REGION;
const secretName = process.env.OPENAI_API_KEY_NAME || "OpenAIAPIKeyName";

if (!jkws_uri || !api_gw_endpoint || !issuer || !audience || !assistant_id) {
  throw new Error('One or more required environment variables are missing.');
}

const apiGwManApiClient = new ApiGatewayManagementApiClient({
  region: region,
  endpoint: api_gw_endpoint,
});

const dynamoDbClient = new DynamoDBClient({ region: region });

const client = jwksRsa({
  cache: true,
  rateLimit: true,
  jwksUri: jkws_uri,
});

const getSigningKey = promisify(client.getSigningKey);

async function verifyToken(token: string, publicKey: string, audience: string): Promise<void> {
  try {
    await verify(token, publicKey, {
      audience,
      issuer: issuer,
    });
  } catch (err) {
    throw new Error('Token verification failed');
  }
}

function decodeToken(token: string): any {
  const decoded = decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error('Invalid token');
  }
  return decoded;
}

async function authorize(token: string): Promise<boolean> {
  try {
    const decodedToken = decodeToken(token);
    const signingKey = await getSigningKey(decodedToken.header.kid);
    if (signingKey) {
      const publicKey = signingKey.getPublicKey();
      await verifyToken(token, publicKey, audience);
      return true;
    }
  } catch (err) {
    console.error('Authorization failed', err);
  }
  return false;
}

async function getThreadId(userId: string): Promise<string | null> {
  const command = new GetItemCommand({
    TableName: 'AssistantThreadTable',
    Key: {
      userId: { S: userId },
    },
  });

  const response = await dynamoDbClient.send(command);
  return response.Item?.threadId?.S || null;
}

async function saveThreadId(userId: string, threadId: string): Promise<void> {
  const command = new PutItemCommand({
    TableName: 'AssistantThreadTable',
    Item: {
      userId: { S: userId },
      threadId: { S: threadId },
    },
  });

  await dynamoDbClient.send(command);
}

const handler: Handler = async (event, context) => {
  console.log('EVENT: \n' + JSON.stringify(event, null, 2));
  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;

  try {
    switch (routeKey) {
      case '$connect':
        console.log('$connect');
        break;
      case '$disconnect':
        console.log('$disconnect');
        break;
      case 'ask': {
        console.log('ask');
        const requestData = JSON.parse(event.body);
        const token = requestData.token;
        const isAuthorized = await authorize(token);
        if (!isAuthorized) {
          console.log('Not Authorized');
          return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized' }),
          };
        }

        console.log('Authorized');
        const prompt = requestData.data;
        const decodedToken = decodeToken(token);
        const userId = decodedToken.payload['sub'];
        console.log('userId', { userId });

        let result = await main(userId, prompt, connectionId);
        console.log('Run Result' + result);
        break;
      }
      default:
        console.log('default');
        break;
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: '{}',
  };
};

async function findOrCreateThread(userId: string, prompt: string, openai: OpenAI): Promise<string> {
  let threadId = await getThreadId(userId);

  if (!threadId) {
    const messages: ThreadCreateParams.Message[] = [{ role: 'user', content: prompt }];
    const thread = await openai.beta.threads.create({
      messages: messages.length > 0 ? messages : [{ role: 'user', content: 'hello.' }],
    });
    threadId = thread.id;
    await saveThreadId(userId, threadId);
  } else {
    const messages: MessageCreateParams = { role: 'user', content: prompt };
    await openai.beta.threads.messages.create(threadId, messages);
  }
  return threadId;
}

async function getOpenAiApiKey(): Promise<string | undefined> {
  const client = new SecretsManagerClient({region});
  try {
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
    return response.SecretString;
  } catch (error) {
    console.log("Error getting OpenAI API key from Secrets Manager:", error);
    throw error;
  }
}

interface ICallbackHandler {
  handleLLMNewToken(token: string): Promise<void>;
  handleLLMEnd(): Promise<void>;
}

async function main(userId: string, prompt: string, connectionId: string) {
  const callbackHandler: ICallbackHandler = {
    async handleLLMNewToken(token: string) {
      const postToConnectionCommandResp = await apiGwManApiClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({ data: token }), 
        }),
      );
      console.log('stream token', { token });
      console.log(`token postToConnectionCommand resp => ${JSON.stringify(postToConnectionCommandResp)}`);
    },
    async handleLLMEnd() {
      const postToConnectionCommandResp = await apiGwManApiClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({ end: true }),
        }),
      );
      console.log('stream end');
      console.log(`end postToConnectionCommand resp => ${JSON.stringify(postToConnectionCommandResp)}`);
    },

  };

  const openaiApiKey = await getOpenAiApiKey();

  if (!openaiApiKey) {
    console.error('OpenAI API key not found in Secrets Manager.');
    return;
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });
  const threadId = await findOrCreateThread(userId, prompt, openai);
  console.log(`Thread ID : ${threadId}`);
  console.log(`Assistant ID : ${assistant_id}`);

  const run = openai.beta.threads.runs.stream(threadId, { assistant_id: assistant_id })
    .on('connect', () => console.log('connect'))
    .on('run', (run) => console.log('run', { run }))
    .on('abort', () => { console.log('abort'); })
    .on('textDelta', (delta: TextDelta, snapshot) => {
      if (delta.value !== undefined) {
        callbackHandler.handleLLMNewToken(delta.value);
      }
    })
    .on('end', () => {
      callbackHandler.handleLLMEnd();
    })
    .on('event', (event) => console.log(event))
    ;

  console.log('Waiting for Run Result...');
  const result = await run.finalRun();
  return result
}

export { handler };
