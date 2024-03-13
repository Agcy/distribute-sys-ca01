import {Aws} from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import * as tb from "./tables"
import * as lambdas from "./lambda-functions"
import * as custom from "aws-cdk-lib/custom-resources";
import {generateBatch} from "../shared/util";
import {movies, movieCasts, movieReviews} from "../seed/movies";
import {createGetMovieReviewsFn} from "./lambda-functions";

type AppApiProps = {
    userPoolId: string;
    userPoolClientId: string;
};

export class AppApi extends Construct {
    constructor(scope: Construct, id: string, props: AppApiProps) {
        super(scope, id);

        const appApi = new apig.RestApi(this, "AppApi", {
            description: "App RestApi",
            endpointTypes: [apig.EndpointType.REGIONAL],
            defaultCorsPreflightOptions: {
                allowOrigins: apig.Cors.ALL_ORIGINS,
            },
        });


        // tables
        const moviesTable = tb.createMoviesTable(this)
        const movieCastsTable = tb.createMovieCastsTable(this)
        const movieReviewsTable = tb.createMovieReviewsTable(this)


        // init data
        // 为movies表创建初始化数据
        new custom.AwsCustomResource(this, "moviesInitData", {
            onCreate: {
                service: "DynamoDB",
                action: "batchWriteItem",
                parameters: {
                    RequestItems: {
                        [moviesTable.tableName]: generateBatch(movies)
                    },
                },
                physicalResourceId: custom.PhysicalResourceId.of("moviesInitData"),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
                resources: [moviesTable.tableArn],
            }),
        });
        // 为movieCasts表创建初始化数据
        new custom.AwsCustomResource(this, "movieCastsInitData", {
            onCreate: {
                service: "DynamoDB",
                action: "batchWriteItem",
                parameters: {
                    RequestItems: {
                        [movieCastsTable.tableName]: generateBatch(movieCasts)
                    },
                },
                physicalResourceId: custom.PhysicalResourceId.of("movieCastsInitData"),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
                resources: [movieCastsTable.tableArn],
            }),
        });
        // 为movieReviews表创建初始化数据
        new custom.AwsCustomResource(this, "movieReviewsInitData", {
            onCreate: {
                service: "DynamoDB",
                action: "batchWriteItem",
                parameters: {
                    RequestItems: {
                        [movieReviewsTable.tableName]: generateBatch(movieReviews)
                    },
                },
                physicalResourceId: custom.PhysicalResourceId.of("movieReviewsInitData"),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
                resources: [movieReviewsTable.tableArn],
            }),
        });


        // lambdas
        const getMovieByIdFn = lambdas.createGetMovieByIdFn(this, moviesTable.tableName, movieCastsTable.tableName)
        const getAllMoviesFn = lambdas.createGetAllMoviesFn(this, moviesTable.tableName)
        const newMovieFn = lambdas.createNewMovieFn(this, moviesTable.tableName)
        const deleteMovieFn = lambdas.createDeleteMovieFn(this, moviesTable.tableName)
        const getMovieCastMembersFn = lambdas.createGetMovieCastMembersFn(this, movieCastsTable.tableName)
        const addMovieReviewFn = lambdas.createAddMovieReviewFn(this, {
            USER_POOL_ID: props.userPoolId,
            CLIENT_ID: props.userPoolClientId,
            REVIEWS_TABLE_NAME: movieReviewsTable.tableName, // 将表名传递给Lambda函数
            REGION: 'eu-west-1', // 根据需要调整区域
        },)
        console.log("addMovieReviewFn deploy success")
        const getMovieReviewsFn = lambdas.createGetMovieReviewsFn(this, movieReviewsTable.tableName)
        const handleMovieReviewsQueryFn = lambdas.createHandleMovieReviewsQueryFn(this, movieReviewsTable.tableName)
        const updateMovieReviewFn = lambdas.createUpdateMovieReviewFn(this, {
            USER_POOL_ID: props.userPoolId,
            CLIENT_ID: props.userPoolClientId,
            REVIEWS_TABLE_NAME: movieReviewsTable.tableName,
            REGION: 'eu-west-1',
        })
        console.log("updateMovieReviewFn deploy success")
        const getReviewsByReviewerFn = lambdas.createGetReviewsByReviewerFn(this, movieReviewsTable.tableName)
        const protectedFn = lambdas.createAppCommonFnProps(this, "ProtectedFn", `${__dirname}/../lambdas/protected.ts`, {
            USER_POOL_ID: props.userPoolId,
            CLIENT_ID: props.userPoolClientId,
            REGION: cdk.Aws.REGION,
        });
        const publicFn = lambdas.createAppCommonFnProps(this, "PublicFn", `${__dirname}/../lambdas/public.ts`, {
            USER_POOL_ID: props.userPoolId,
            CLIENT_ID: props.userPoolClientId,
            REGION: cdk.Aws.REGION,
        });
        const authorizerFn = lambdas.createAppCommonFnProps(this, "AuthorizerFn", `${__dirname}/../lambdas/auth/authorizer.ts`, {
            USER_POOL_ID: props.userPoolId,
            CLIENT_ID: props.userPoolClientId,
            REGION: cdk.Aws.REGION,
        });
        const getTranslatedReviewsFn = lambdas.createTranslatedReviewsFn(this, movieReviewsTable.tableName)


        // authentic cookie
        const requestAuthorizer = new apig.RequestAuthorizer(
            this,
            "RequestAuthorizer",
            {
                identitySources: [apig.IdentitySource.header("cookie")],
                handler: authorizerFn,
                resultsCacheTtl: cdk.Duration.minutes(0),
            }
        );


        // Permissions
        moviesTable.grantReadData(getMovieByIdFn)
        moviesTable.grantReadData(getAllMoviesFn)
        moviesTable.grantReadWriteData(newMovieFn)
        moviesTable.grantWriteData(deleteMovieFn);
        movieCastsTable.grantReadData(getMovieByIdFn);
        movieCastsTable.grantReadData(getMovieCastMembersFn);
        movieReviewsTable.grantReadData(getMovieReviewsFn);
        movieReviewsTable.grantReadData(handleMovieReviewsQueryFn);
        movieReviewsTable.grantReadData(getReviewsByReviewerFn);
        movieReviewsTable.grantReadWriteData(addMovieReviewFn);
        movieReviewsTable.grantReadWriteData(updateMovieReviewFn);
        movieReviewsTable.grantReadData(getTranslatedReviewsFn);


        // route
        const protectedRes = appApi.root.addResource("protected");
        const publicRes = appApi.root.addResource("public");
        const moviesEndpoint = appApi.root.addResource("movies");
        const movieEndpoint = moviesEndpoint.addResource("{movieId}");
        const moviesCastEndpoint = moviesEndpoint.addResource("cast")
        const moviesReviewsEndpoint = movieEndpoint.addResource("reviews");
        const queryReviewsKeyEndpoint = moviesReviewsEndpoint.addResource("{queryParam}")
        const reviewerReviewsEndpoint = appApi.root.addResource("reviews");
        const reviewerEndpoint = reviewerReviewsEndpoint.addResource("{reviewerName}");
        const singleReviewEndpoint = reviewerEndpoint.addResource("{movieId}")
        const translationEndpoint = singleReviewEndpoint.addResource("translation")


        // methods
        // protected
        protectedRes.addMethod("GET", new apig.LambdaIntegration(protectedFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });
        // public
        publicRes.addMethod("GET", new apig.LambdaIntegration(publicFn));
        // movies
        moviesEndpoint.addMethod("GET", new apig.LambdaIntegration(getAllMoviesFn, {proxy: true}));
        moviesEndpoint.addMethod("POST", new apig.LambdaIntegration(newMovieFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });
        moviesCastEndpoint.addMethod("GET", new apig.LambdaIntegration(getMovieCastMembersFn, {proxy: true}));
        // movie
        movieEndpoint.addMethod("GET", new apig.LambdaIntegration(getMovieByIdFn, {proxy: true}));
        movieEndpoint.addMethod("DELETE", new apig.LambdaIntegration(deleteMovieFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });
        //reviews
        // POST /movies/reviews - add a movie review.
        moviesEndpoint.addResource("reviews").addMethod(
            "POST",
            new apig.LambdaIntegration(addMovieReviewFn),
            {authorizer: requestAuthorizer, authorizationType: apig.AuthorizationType.CUSTOM,}
        )
        // GET /movies/{movieId}/reviews?minRating=n - Get all the reviews for the specified movie.
        // Get the reviews for the specified movie with a rating greater than the minRating.
        moviesReviewsEndpoint.addMethod("GET", new apig.LambdaIntegration(getMovieReviewsFn, {proxy: true}));
        // GET /movies/{movieId}/reviews/{reviewerName} - Get the review written by the named reviewer for the specified movie.
        // GET /movies/{movieId}/reviews/{year} - Get the reviews written in a specific year for a specific movie.

        queryReviewsKeyEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(handleMovieReviewsQueryFn, {proxy: true}));
        queryReviewsKeyEndpoint.addMethod(
            "PUT",
            new apig.LambdaIntegration(updateMovieReviewFn),
            {authorizer: requestAuthorizer, authorizationType: apig.AuthorizationType.CUSTOM,}
        )
        // PUT /movies/{movieId}/reviews/{reviewerName} - Update the text of a review.
        // reviewers
        // GET /reviews/{reviewerName} - Get all the reviews written by a specific reviewer.
        reviewerEndpoint
            .addMethod("GET", new apig.LambdaIntegration(getReviewsByReviewerFn, {proxy: true}));
        // GET /reviews/{reviewerName}/{movieId}/translation?language=code - Get a translated version of a movie review using the movie ID and reviewer name as the identifier.
        translationEndpoint
            .addMethod("GET", new apig.LambdaIntegration(getTranslatedReviewsFn, {proxy : true}))
    }
}
