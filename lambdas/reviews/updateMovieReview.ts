import {APIGatewayProxyHandlerV2} from "aws-lambda";
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient({region: process.env.REGION});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", event);
        const parameters = event?.pathParameters;
        const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
        const reviewerName = event.pathParameters?.queryParam;
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!movieId || !reviewerName || !body) {
            return {
                statusCode: 400,
                body: JSON.stringify({message: "Missing or invalid parameters"}),
            };
        }

        const params: any = {
            TableName: process.env.TABLE_NAME,
            Key: {
                movieId: movieId,
                reviewerName: reviewerName,
            },
            UpdateExpression: 'SET content = :content, rating = :rating ',
            ExpressionAttributeValues: {
                ':content': body.content,
                ':rating': body.rating
            },
            ReturnValues: 'UPDATED_NEW',
        };

        return {
            statusCode: 200,
            body: JSON.stringify({message: "Review updated successfully"}),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({error}),
        };
    }
};
