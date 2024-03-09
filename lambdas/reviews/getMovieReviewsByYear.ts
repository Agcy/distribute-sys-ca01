import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", event);
        const movieId = event.pathParameters?.movieId;
        const year = event.pathParameters?.year;

        if (!movieId || !year) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing or invalid movieId/year" }),
            };
        }

        // Assuming reviewDate is stored in a YYYY-MM-DD format
        const startOfYear = `${year}-01-01`;
        const endOfYear = `${year}-12-31`;

        const commandOutput = await docClient.send(
            new QueryCommand({
                TableName: process.env.REVIEWS_TABLE_NAME, // Make sure this matches your table name
                KeyConditionExpression: "movieId = :movieId and reviewDate BETWEEN :startOfYear AND :endOfYear",
                ExpressionAttributeValues: {
                    ":movieId": { N: movieId },
                    ":startOfYear": { N: startOfYear },
                    ":endOfYear": {N: endOfYear },
                },
            })
        );

        if (!commandOutput.Items || commandOutput.Items.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "No reviews found for this movie in the specified year" }),
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
