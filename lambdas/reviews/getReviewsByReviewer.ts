import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", event);
        const reviewerName = event.pathParameters?.reviewerName;

        if (!reviewerName) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Missing or invalid reviewerName" }),
            };
        }

        const commandOutput = await ddbDocClient.send(
            new ScanCommand({
                TableName: process.env.REVIEWS_TABLE_NAME, // Make sure this matches your table name
                FilterExpression: "reviewerName = :reviewerName",
                ExpressionAttributeValues: {
                    ":reviewerName": { S: reviewerName },
                },
            })
        );

        if (!commandOutput.Items || commandOutput.Items.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "No reviews found for this reviewer" }),
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


function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({region: process.env.REGION});
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = {marshallOptions, unmarshallOptions};
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
