import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", event);
        const movieId = event.pathParameters?.movieId;
        const reviewerName = event.pathParameters?.reviewerName;
        const body = event.body ? JSON.parse(event.body) : {};

        if (!movieId || !reviewerName || !body.content) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing or invalid parameters" }),
            };
        }

        await docClient.send(
            new UpdateCommand({
                TableName: process.env.TABLE_NAME,
                Key: {
                    movieId: movieId,
                    reviewerName: reviewerName,
                },
                UpdateExpression: "set content = :content",
                ExpressionAttributeValues: {
                    ":content": body.content,
                },
            })
        );

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ message: "Review updated successfully" }),
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
