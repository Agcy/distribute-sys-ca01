import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient, DynamoDBServiceException } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import {errorResponse} from '../utils'
// @ts-ignore
import schema from "../../shared/types.schema.json"; // 路径根据你的项目结构调整

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["MovieReviews"] || {});

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", event);
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!body || !isValidBodyParams(body)) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing or invalid request body" }),
            };
        }

        const putCommandInput: PutCommandInput = {
            TableName: process.env.REVIEWS_TABLE_NAME,
            Item: body,
        };
        await ddbDocClient.send(new PutCommand(putCommandInput));

        return {
            statusCode: 201,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ message: "Review added successfully" }),
        };
    } catch (error) {
        console.error(JSON.stringify(error));
        if (error instanceof DynamoDBServiceException) {
            if (error.name === 'ConditionalCheckFailedException') {
                return errorResponse(400, 'Conditional check failed');
            } else if (error.name === 'ProvisionedThroughputExceededException') {
                return errorResponse(429, 'Provisioned throughput exceeded');
            } else if (error.name === 'ResourceNotFoundException') {
                return errorResponse(404, 'Resource not found');
            }
        }
        // unknown errors
        return errorResponse(500, 'An unexpected error occurred');
    }
};

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
