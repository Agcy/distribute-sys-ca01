import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", event);
        const movieId = event.pathParameters?.movieId;
        const reviewerName = event.pathParameters?.reviewerName;

        if (!movieId || !reviewerName) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing or invalid movieId/reviewerName" }),
            };
        }

        const commandOutput = await docClient.send(
            new QueryCommand({
                TableName: process.env.REVIEWS_TABLE_NAME,
                IndexName: 'ReviewerIndex', // 假设你有一个基于reviewerName的全局二级索引
                KeyConditionExpression: "movieId = :movieId AND reviewerName = :reviewerName",
                ExpressionAttributeValues: {
                    ":movieId": { N: movieId },
                    ":reviewerName": {N: reviewerName },
                },
            })
        );

        if (!commandOutput.Items || commandOutput.Items.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "No review found for this movie by the specified reviewer" }),
            };
        }

        const body = {
            data: commandOutput.Items[0], // 假设一个评论者只能对一部电影发表一条评论
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
