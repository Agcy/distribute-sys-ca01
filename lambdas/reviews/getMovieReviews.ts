import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", event);
        const movieId = event.pathParameters?.movieId;
        const minRating = event.queryStringParameters?.minRating;
        const maxRating = event.queryStringParameters?.maxRating;

        if (!movieId) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing or invalid movieId" }),
            };
        }

        let filterExpression = "";
        let expressionAttributeValues: { [key: string]: { N: string } } = {
            ":movieId": { N: movieId.toString() },
        };

        if (minRating) {
            filterExpression += "rating >= :minRating";
            expressionAttributeValues[":minRating"] = { N: minRating };
        }

        if (maxRating) {
            if (filterExpression.length > 0) {
                filterExpression += " AND ";
            }
            filterExpression += "rating <= :maxRating";
            expressionAttributeValues[":maxRating"] = { N: maxRating };
        }

        const queryCommandInput: {
            TableName: string | undefined;
            KeyConditionExpression: string;
            ExpressionAttributeValues: { [key: string]: { N: string } };
            FilterExpression?: string;
        } = {
            TableName: process.env.REVIEWS_TABLE_NAME,
            KeyConditionExpression: "movieId = :movieId",
            ExpressionAttributeValues: expressionAttributeValues,
            FilterExpression: filterExpression.length > 0 ? filterExpression : undefined,
        };

        if (filterExpression.length > 0) {
            queryCommandInput.FilterExpression = filterExpression;
        }

        const commandOutput = await docClient.send(new QueryCommand(queryCommandInput));

        if (!commandOutput.Items || commandOutput.Items.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "No reviews found for this movie" }),
            };
        }

        const body = {
            data: commandOutput.Items,
        };

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body),
        };
    } catch (error: any) {
        console.error(JSON.stringify(error));
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error }),
        };
    }
};
