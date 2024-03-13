import {APIGatewayProxyHandlerV2} from "aws-lambda";
import {DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient, DynamoDBServiceException} from "@aws-sdk/client-dynamodb";
import {errorResponse} from '../utils'

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", event);
        const parameters = event?.pathParameters;
        const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
        const reviewerName = parameters?.queryParam;
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!movieId || !reviewerName || !body) {
            return {
                statusCode: 400,
                body: JSON.stringify({message: "Missing or invalid parameters"}),
            };
        }

        console.log("begin insert")

        await ddbDocClient.send(
            new UpdateCommand(
                {
                    TableName: process.env.REVIEWS_TABLE_NAME,
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
                })
        )

        console.log("this is a body",body)
        console.log("this is reviewerName",reviewerName)
        return {
            statusCode: 200,
            body: JSON.stringify({message: "Review updated successfully"}),
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
