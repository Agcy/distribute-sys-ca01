## Serverless REST Assignment.

__Name:__ Haopeng Liang

__Video demonstration:__ https://youtu.be/ieHKSaMgHlk

This repository contains an implementation of a serverless REST API for the AWS platform. The CDK framework is used to provision its infrastructure. The API's domain context is movie reviews.

### API endpoints.

[ Provide a bullet-point list of the app's endpoints (excluding the Auth API endpoints you have successfully implemented in full. Omit those in the assignment specification that you did not complete.]

+ POST /movies/reviews - add a movie review.
+ GET /movies/{movieId}/reviews - Get all the reviews for a movie with the specified id.
+ GET /movies/{movieId}/reviews?minRating=n - Get all the reviews for the film with the specified ID whose rating was higher than the minRating.
+ GET /movies/{movieId}/reviews/{year} - Get the reviews written in a specific year for a specific movie.
+ GET /movies/{movieId}/reviews/{reviewerName} - Get the review for the movie with the specified movie ID and written by the named reviewer.
+ PUT /movies/{movieId}/reviews/{reviewerName} - Update the text of a review.
+ GET /reviews/{reviewerName} - Get all the reviews written by a specific reviewer.
+ GET /reviews/{reviewerName}/{movieId}/translation?language=code - Get a translated version of a movie review using the movie ID and reviewer name as the identifier.

[Include screenshots from the AWS management console (API Gateway service) that clearly show the deployed API ( ensure the font size is legible). ]

1. POST /movies/reviews

   ![](./images/appapi1.png)

2. GET /movies/{movieId}/reviews

   ![](./images/appapi2.png)

3. GET /movies/{movieId}/reviews?minRating=n

   ![](./images/appapi3-1.png)

   ![](./images/appapi3-2.png)

4. GET /movies/{movieId}/reviews/{year}

   ![](./images/appapi4.png)

5. GET /movies/{movieId}/reviews/{reviewerName}

   ![](./images/appapi5.png)

6. PUT /movies/{movieId}/reviews/{reviewerName}

   ![](./images/appapi6.png)

7. GET /reviews/{reviewerName}

   ![](./images/appapi7.png)

8. GET /reviews/{reviewerName}/{movieId}/translation?language=code

   ![](./images/appapi8.png)

### Authentication (if relevant).

[Include a screenshot from the AWS management console (Cognito User Pools) showing a confirmed user account.]

1. auth api

![](./images/authapi1.png)

before show sign up function

![](./images/authapi1-2.png)

2. sign up POST /auth/signup

   ![](./images/authapi2-1.png)

   ![](./images/authapi2-2.png)

3. comfirm sign up POST auth/confirm_signup

   ![](./images/authapi3-1.png)

   ![](./images/authapi3-2.png)

   ![](./images/authapi3-3.png)

4. sign in POST auth/signin

   ![](./images/authapi4-1.png)

### Independent learning (If relevant).

[ Briefly explain any aspects of your submission that required independent research and learning, i.e. typically related to the higher grade bands. State the source files that have evidence of this.



1. **TRANSLATION**

   lambda file in [`getTranslatedReviews.ts`](https://github.com/Agcy/distribute-sys-ca01/blob/main/lambdas/reviews/getTranslatedReviews.ts) 

   ```typescript
   // other code ........
   
   	// query reviews
   	const queryCommandInput: any = {
           TableName: process.env.REVIEWS_TABLE_NAME,
           KeyConditionExpression: 'reviewerName = :reviewerName AND movieId = :movieId',
           ExpressionAttributeValues: {
               ':reviewerName': reviewerName,
               ":movieId": movieId,
           },
       };
   
       const queryOutput = await ddbDocClient.send(new QueryCommand(queryCommandInput));
   
       // @ts-ignore
       const response = queryOutput.Items[0];
       console.log(queryOutput.Items);
       const text = response.content;
       
   // other code .........
   		// translate the reviews
   		const translateParams: Translate.Types.TranslateTextRequest = {
               SourceLanguageCode: 'en',
               TargetLanguageCode: language,
               Text: text
           };
           const translatedMessage = await translate.translateText(translateParams).promise();
           return {
               statusCode: 200,
               headers: {"content-type": "application/json"},
               body: JSON.stringify({translatedMessage}),
           };
   // other code .........
   ```

   translate into CHINESE

   ![](./images/indep1-1.png)

   translate into JAPANESE

   ![](./images/indep1-2.png)

   translate into IRISH

   ![](./images/indep1-3.png)

   translate into FRENCH

   ![](./images/indep1-4.png)

   support auto source reviews language detect

   ![](./images/indep1-5.png)

   ![](./images/indep1-6.png)

   reference

   [AWS Documentation](https://docs.aws.amazon.com/translate/latest/dg/sync-console.html)

   

2. **ERROR HANDLING**

   full content in [updateMovieReview.ts](https://github.com/Agcy/distribute-sys-ca01/blob/main/lambdas/reviews/updateMovieReview.ts) and [addMovieReview.ts](https://github.com/Agcy/distribute-sys-ca01/blob/main/lambdas/reviews/addMovieReview.ts)

   ```typescript
   	if (error instanceof DynamoDBServiceException) {
               if (error.name === 'ConditionalCheckFailedException') {
                   return errorResponse(400, 'Conditional check failed');
               } else if (error.name === 'ProvisionedThroughputExceededException') {
                   return errorResponse(429, 'Provisioned throughput exceeded');
               } else if (error.name === 'ResourceNotFoundException') {
                   return errorResponse(404, 'Resource not found');
               }
           }
   
   export const errorResponse = (statusCode: number, message: string) => ({
       statusCode: statusCode,
       headers: {
           "content-type": "application/json",
       },
       body: JSON.stringify({error: message}),
   })
   ```

   Generally, since this kind of error often occurs in the case of highly concurrent access, so it is inconvenient to demonstrate it in the local runtime.

   reference: [Error handling with DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html)
