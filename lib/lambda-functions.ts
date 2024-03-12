import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";


export const createGetMovieByIdFn = (scope: Construct, moviesTableName: string, movieCastsTableName: string): lambdanode.NodejsFunction => {
    return new lambdanode.NodejsFunction(scope, "GetMovieByIdFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: `${__dirname}/../lambdas/movies/getMovieById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            TABLE_NAME: moviesTableName,
            MOVIE_CASTS_TABLE: movieCastsTableName,
            REGION: 'eu-west-1',
        },
    });
};

// 定义其他 Lambda 函数，例如 getAllMoviesFn
export const createGetAllMoviesFn = (scope: Construct, moviesTableName: string): lambdanode.NodejsFunction => {
    return new lambdanode.NodejsFunction(scope, "GetAllMoviesFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: `${__dirname}/../lambdas/movies/getAllMovies.ts`, // 修改为你的Lambda函数代码路径
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            TABLE_NAME: moviesTableName,
            REGION: 'eu-west-1',
        },
    });
};

export const createNewMovieFn = (scope: Construct, moviesTableName: string): lambdanode.NodejsFunction => {
    return new lambdanode.NodejsFunction(scope, "AddMovieFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        handler: "handler",
        entry: `${__dirname}/../lambdas/movies/addMovie.ts`, // 修改为你的Lambda函数代码路径
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            TABLE_NAME: moviesTableName,
            REGION: 'eu-west-1',
        },
    });
};

export const createDeleteMovieFn = (scope: Construct, moviesTableName: string): lambdanode.NodejsFunction => {
    return new lambdanode.NodejsFunction(scope, "DeleteMovieFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X, // Ensure runtime compatibility
        entry: `${__dirname}/../lambdas/movies/deleteMovie.ts`, // Adjust the path as needed
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            TABLE_NAME: moviesTableName,
            REGION: 'eu-west-1',
        },
    });
}

export const createGetMovieCastMembersFn = (scope: Construct, moviesTableName: string): lambdanode.NodejsFunction => {
    return new lambdanode.NodejsFunction(
        scope,
        "GetCastMemberFn",
        {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_16_X,
            entry: `${__dirname}/../lambdas/movies/getMovieCastMember.ts`,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                TABLE_NAME: moviesTableName,
                REGION: "eu-west-1",
            },
        }
    );
}

export const createAddMovieReviewFn = (scope: Construct, reviewsTableName: string): lambdanode.NodejsFunction => {
    return new lambdanode.NodejsFunction(scope, "AddMovieReviewFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X, // 确保与你的环境兼容
        entry: `${__dirname}/../lambdas/reviews/addMovieReview.ts`, // Lambda函数代码的路径
        handler: 'handler',
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            REVIEWS_TABLE_NAME: reviewsTableName, // 将表名传递给Lambda函数
            REGION: 'eu-west-1', // 根据需要调整区域
        },
    });
}

export const createGetMovieReviewsFn = (scope: Construct, reviewsTableName: string): lambdanode.NodejsFunction => {
    return new lambdanode.NodejsFunction(scope, "GetMovieReviewsFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X, // 确保与你的环境兼容
        entry: `${__dirname}/../lambdas/reviews/getMovieReviews.ts`, // Lambda函数代码的路径
        handler: 'handler', // 你的Lambda函数入口文件中的函数名
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            REVIEWS_TABLE_NAME: reviewsTableName, // 将表名传递给Lambda函数
            REGION: 'eu-west-1', // 根据需要调整区域
        },
    });
}

export const createHandleMovieReviewsQueryFn = (scope: Construct, reviewsTableName: string): lambdanode.NodejsFunction => {
    return new lambdanode.NodejsFunction(scope, "HandleMovieReviewsQueryFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/reviews/handleMovieReviewsQuery.ts`,
        handler: 'handler',
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            REVIEWS_TABLE_NAME: reviewsTableName,
            REGION: 'eu-west-1',
        },
    });
}

export const createUpdateMovieReviewFn = (scope: Construct, reviewsTableName: string): lambdanode.NodejsFunction => {
    return new lambdanode.NodejsFunction(scope, "UpdateMovieReviewFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/reviews/updateMovieReview.ts`,
        handler: 'handler',
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            REVIEWS_TABLE_NAME: reviewsTableName,
            REGION: 'eu-west-1',
        },
    });
}

export const createGetReviewsByReviewerFn = (scope: Construct, reviewsTableName: string): lambdanode.NodejsFunction => {
    return new lambdanode.NodejsFunction(scope, "GetReviewsByReviewerFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/reviews/getReviewsByReviewer.ts`,
        handler: 'handler',
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
            REVIEWS_TABLE_NAME: reviewsTableName,
            REGION: 'eu-west-1',
        },
    });
}

export const createAppCommonFnProps = (scope: Construct, id: string, entryPath: string, environment: { [key: string]: string }) => {
    return new lambdanode.NodejsFunction(scope, id, {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        handler: "handler",
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        entry: entryPath,
        environment,
    });
};
