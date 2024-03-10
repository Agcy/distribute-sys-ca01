import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient, QueryCommand, QueryCommandOutput } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", event);
        const movieId = event.pathParameters?.movieId;
        const thirdParam = event.pathParameters?.thirdParam; // 可能是year或reviewerName

        if (!movieId || !thirdParam) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing or invalid parameters" }),
            };
        }

        // 检查thirdParam是年份还是名称
        if (/^\d{4}$/.test(thirdParam)) {
            // 如果thirdParam是年份
            const startOfYear = `${thirdParam}-01-01`;
            const endOfYear = `${thirdParam}-12-31`;

            const commandOutput = await docClient.send(
                new QueryCommand({
                    TableName: process.env.REVIEWS_TABLE_NAME,
                    KeyConditionExpression: "movieId = :movieId and reviewDate BETWEEN :startOfYear AND :endOfYear",
                    ExpressionAttributeValues: {
                        ":movieId": { N: movieId },
                        ":startOfYear": { N: startOfYear },
                        ":endOfYear": { N: endOfYear },
                    },
                })
            );

            // 返回年份查询结果
            return handleQueryResponse(commandOutput);
        } else {
            // 如果thirdParam是评论者名称
            const commandOutput = await docClient.send(
                new QueryCommand({
                    TableName: process.env.REVIEWS_TABLE_NAME,
                    IndexName: 'ReviewerIndex',
                    KeyConditionExpression: "movieId = :movieId AND reviewerName = :reviewerName",
                    ExpressionAttributeValues: {
                        ":movieId": { N: movieId },
                        ":reviewerName": { N: thirdParam },
                    },
                })
            );

            // 返回评论者名称查询结果
            return handleQueryResponse(commandOutput);
        }
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

function handleQueryResponse(commandOutput : QueryCommandOutput) {
    if (!commandOutput.Items || commandOutput.Items.length === 0) {
        return {
            statusCode: 404,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ message: "No reviews found" }),
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
}
