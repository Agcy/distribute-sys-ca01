import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const movieId = event.pathParameters?.movieId ? parseInt(event.pathParameters.movieId) : undefined;
    const includeCast = event.queryStringParameters?.cast === "true";

    if (!movieId) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing movie Id" }),
      };
    }

    const movieCommandOutput = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: movieId },
      })
    );

    if (!movieCommandOutput.Item) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Invalid movie Id" }),
      };
    }

    let response = {
      data: movieCommandOutput.Item,
    };

    if (includeCast) {
      const castCommandOutput = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.MOVIE_CAST_TABLE,
          KeyConditionExpression: "movieId = :movieId",
          ExpressionAttributeValues: {
            ":movieId": movieId,
          },
        })
      );

      response.data.cast = castCommandOutput.Items;
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
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
