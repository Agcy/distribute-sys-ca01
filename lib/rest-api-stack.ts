import * as cdk from "aws-cdk-lib";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import {Construct} from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import {generateBatch} from "../shared/util";
import {movies, movieCasts, movieReviews} from "../seed/movies";

export class RestAPIStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Tables
        const moviesTable = new dynamodb.Table(this, "MoviesTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {name: "id", type: dynamodb.AttributeType.NUMBER},
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Movies",
        });

        const movieCastsTable = new dynamodb.Table(this, "MovieCastTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {name: "movieId", type: dynamodb.AttributeType.NUMBER},
            sortKey: {name: "actorName", type: dynamodb.AttributeType.STRING},
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "MovieCast",
        });

        const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {name: "movieId", type: dynamodb.AttributeType.NUMBER},
            sortKey: {name: "reviewDate", type: dynamodb.AttributeType.STRING},
            removalPolicy: cdk.RemovalPolicy.DESTROY, // 注意：实际部署时可能需要更保守的策略
            tableName: "MovieReviews",
        });

        movieCastsTable.addLocalSecondaryIndex({
            indexName: "roleIx",
            sortKey: {name: "roleName", type: dynamodb.AttributeType.STRING},
        });

        movieReviewsTable.addLocalSecondaryIndex({
            indexName: "reviewIx",
            sortKey: {name: "reviewDate", type: dynamodb.AttributeType.STRING}
        })


        // Functions
        const getMovieByIdFn = new lambdanode.NodejsFunction(
            this,
            "GetMovieByIdFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../lambdas/movies/getMovieById.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: moviesTable.tableName,
                    MOVIE_CAST_TABLE: movieCastsTable.tableName,
                    REGION: 'eu-west-1',
                },
            }
        );

        movieCastsTable.grantReadData(getMovieByIdFn);

        const getAllMoviesFn = new lambdanode.NodejsFunction(
            this,
            "GetAllMoviesFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../lambdas/movies/getAllMovies.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: moviesTable.tableName,
                    REGION: 'eu-west-1',
                },
            });

        // 为movies表创建初始化数据的Custom Resource
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

// 为movieCasts表创建初始化数据的Custom Resource
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

// 为movieReviews表创建初始化数据的Custom Resource
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


        // Permissions
        moviesTable.grantReadData(getMovieByIdFn)
        moviesTable.grantReadData(getAllMoviesFn)

        // REST API
        const api = new apig.RestApi(this, "RestAPI", {
            description: "demo api",
            deployOptions: {
                stageName: "dev",
            },
            defaultCorsPreflightOptions: {
                allowHeaders: ["Content-Type", "X-Amz-Date"],
                allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
                allowCredentials: true,
                allowOrigins: ["*"],
            },
        });

        const moviesEndpoint = api.root.addResource("movies");
        moviesEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getAllMoviesFn, {proxy: true})
        );

        const movieEndpoint = moviesEndpoint.addResource("{movieId}");
        movieEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getMovieByIdFn, {proxy: true})
        );

        const newMovieFn = new lambdanode.NodejsFunction(this, "AddMovieFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_16_X,
            entry: `${__dirname}/../lambdas/movies/addMovie.ts`,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                TABLE_NAME: moviesTable.tableName,
                REGION: "eu-west-1",
            },
        });

        moviesTable.grantReadWriteData(newMovieFn)

        moviesEndpoint.addMethod(
            "POST",
            new apig.LambdaIntegration(newMovieFn, {proxy: true})
        );


        const deleteMovieFn = new lambdanode.NodejsFunction(this, "DeleteMovieFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X, // Ensure runtime compatibility
            entry: `${__dirname}/../lambdas/movies/deleteMovie.ts`, // Adjust the path as needed
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                TABLE_NAME: moviesTable.tableName,
                REGION: 'eu-west-1',
            },
        });

        moviesTable.grantWriteData(deleteMovieFn);

        movieEndpoint.addMethod(
            "DELETE",
            new apig.LambdaIntegration(deleteMovieFn, {proxy: true})
        );


        const getMovieCastMembersFn = new lambdanode.NodejsFunction(
            this,
            "GetCastMemberFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_16_X,
                entry: `${__dirname}/../lambdas/movies/getMovieCastMember.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: movieCastsTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        movieCastsTable.grantReadData(getMovieCastMembersFn);

        const movieCastEndpoint = moviesEndpoint.addResource("cast");
        movieCastEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getMovieCastMembersFn, {proxy: true})
        );


        // POST /movies/reviews - add a movie review.
        const addMovieReviewFn = new lambdanode.NodejsFunction(this, "AddMovieReviewFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_16_X, // 确保与你的环境兼容
            entry: `${__dirname}/../lambdas/reviews/addMovieReview.ts`, // Lambda函数代码的路径
            handler: 'handler',
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                REVIEWS_TABLE_NAME: movieReviewsTable.tableName, // 将表名传递给Lambda函数
                REGION: 'eu-west-1', // 根据需要调整区域
            },
        });

        const reviewsEndpoint = moviesEndpoint.addResource("reviews");

        // 授权Lambda函数访问MovieReviews表进行写操作
        movieReviewsTable.grantReadWriteData(addMovieReviewFn);
        reviewsEndpoint.addMethod("POST", new apig.LambdaIntegration(addMovieReviewFn, {proxy: true}));


        // GET /movies/{movieId}/reviews - Get all the reviews for the specified movie.
        const getMovieReviewsFn = new lambdanode.NodejsFunction(this, "GetMovieReviewsFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X, // 确保与你的环境兼容
            entry: `${__dirname}/../lambdas/reviews/getMovieReviews.ts`, // Lambda函数代码的路径
            handler: 'handler', // 你的Lambda函数入口文件中的函数名
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                REVIEWS_TABLE_NAME: movieReviewsTable.tableName, // 将表名传递给Lambda函数
                REGION: 'eu-west-1', // 根据需要调整区域
            },
        });
        // 授权Lambda函数访问MovieReviews表
        movieReviewsTable.grantReadData(getMovieReviewsFn);

        const moviesReviewsEndpoint = movieEndpoint.addResource("reviews");

        moviesReviewsEndpoint.addMethod("GET", new apig.LambdaIntegration(getMovieReviewsFn, {proxy: true}));

        // // GET /movies/{movieId}/reviews/{reviewerName} - Get the review written by the named reviewer for the specified movie.
        // const getMovieReviewByReviewerFn = new lambdanode.NodejsFunction(this, "GetMovieReviewByReviewerFn", {
        //     architecture: lambda.Architecture.ARM_64,
        //     runtime: lambda.Runtime.NODEJS_14_X, // 请确保与你的环境兼容
        //     entry: `${__dirname}/../lambdas/reviews/getMovieReviewByReviewer.ts`, // Lambda函数代码的路径
        //     handler: 'handler',
        //     timeout: cdk.Duration.seconds(10),
        //     memorySize: 128,
        //     environment: {
        //         TABLE_NAME: movieReviewsTable.tableName, // 确保使用正确的环境变量
        //         REGION: 'eu-west-1', // 根据需要调整区域
        //     },
        // });
        //
        // // 授权Lambda函数访问MovieReviews表
        // movieReviewsTable.grantReadData(getMovieReviewByReviewerFn);
        //
        // const movieReviewByIdAndReviewerEndpoint = moviesReviewsEndpoint.addResource("{reviewerName}");
        // movieReviewByIdAndReviewerEndpoint.addMethod("GET", new apig.LambdaIntegration(getMovieReviewByReviewerFn, {proxy: true}));

        //
        const handleMovieReviewsQueryFn = new lambdanode.NodejsFunction(this, "HandleMovieReviewsQueryFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambdas/reviews/handleMovieReviewsQuery.ts`,
            handler: 'handler',
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                REVIEWS_TABLE_NAME: movieReviewsTable.tableName,
                REGION: 'eu-west-1',
            },
        });

        // 授权Lambda函数访问MovieReviews表
        movieReviewsTable.grantReadData(handleMovieReviewsQueryFn);

        // 由于API Gateway不支持在同一路径下有两个动态参数，我们使用一个Lambda来处理两种情况
        // 移除原有的reviewsByYearEndpoint和movieReviewByIdAndReviewerEndpoint的定义
        // 并替换为下面的配置
        const reviewsQueryEndpoint = moviesReviewsEndpoint.addResource("{queryParam}");
        reviewsQueryEndpoint.addMethod("GET", new apig.LambdaIntegration(handleMovieReviewsQueryFn, { proxy: true }));


        // PUT /movies/{movieId}/reviews/{reviewerName} - Update the text of a review.
        const updateMovieReviewFn = new lambdanode.NodejsFunction(this, "UpdateMovieReviewFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_16_X,
            entry: `${__dirname}/../lambdas/reviews/updateMovieReview.ts`,
            handler: 'handler',
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                TABLE_NAME: movieReviewsTable.tableName,
                REGION: 'eu-west-1',
            },
        });

        // 授权Lambda函数访问MovieReviews表进行更新操作
        movieReviewsTable.grantReadWriteData(updateMovieReviewFn);

        // 在API网关中添加路由以支持PUT请求
        reviewsQueryEndpoint.addMethod("PUT", new apig.LambdaIntegration(updateMovieReviewFn, {proxy: true}));


        // // GET /movies/{movieId}/reviews/{year} - Get the reviews written in a specific year for a specific movie.
        // const getMovieReviewsByYearFn = new lambdanode.NodejsFunction(this, "GetMovieReviewsByYearFn", {
        //     architecture: lambda.Architecture.ARM_64,
        //     runtime: lambda.Runtime.NODEJS_14_X,
        //     entry: `${__dirname}/../lambdas/reviews/getMovieReviewsByYear.ts`,
        //     handler: 'handler',
        //     timeout: cdk.Duration.seconds(10),
        //     memorySize: 128,
        //     environment: {
        //         REVIEWS_TABLE_NAME: movieReviewsTable.tableName, // 确保使用正确的环境变量
        //         REGION: 'eu-west-1',
        //     },
        // });
        //
        // // 授权Lambda函数访问MovieReviews表
        // movieReviewsTable.grantReadData(getMovieReviewsByYearFn);
        //
        // // 在API网关中添加一个新的资源和方法以支持GET请求
        // const reviewsByYearEndpoint = moviesReviewsEndpoint.addResource("{year}");
        // reviewsByYearEndpoint.addMethod("GET", new apig.LambdaIntegration(getMovieReviewsByYearFn, { proxy: true }));


        const getReviewsByReviewerFn = new lambdanode.NodejsFunction(this, "GetReviewsByReviewerFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambdas/reviews/getReviewsByReviewer.ts`,
            handler: 'handler',
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                REVIEWS_TABLE_NAME: movieReviewsTable.tableName,
                REGION: 'eu-west-1',
            },
        });

        // 授权Lambda函数访问MovieReviews表
        movieReviewsTable.grantReadData(getReviewsByReviewerFn);

        // 在API网关中添加一个新的资源和方法以支持GET请求
        const reviewerReviewsEndpoint = api.root.addResource("reviews").addResource("{reviewerName}");
        reviewerReviewsEndpoint.addMethod("GET", new apig.LambdaIntegration(getReviewsByReviewerFn, { proxy: true }));

    }
}
