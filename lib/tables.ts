import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export const createMoviesTable = (scope: Construct): dynamodb.Table => {
    return new dynamodb.Table(scope, "MoviesTable", {
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        tableName: "Movies",
    });
};

export const createMovieCastsTable = (scope: Construct): dynamodb.Table => {
    const movieCastsTable = new dynamodb.Table(scope, "MovieCastsTable", {
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
        sortKey: { name: "actorName", type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        tableName: "MovieCasts",
    });
    movieCastsTable.addLocalSecondaryIndex({
        indexName: "roleIx",
        sortKey: {name: "roleName", type: dynamodb.AttributeType.STRING},
    });
    return movieCastsTable;
};

export const createMovieReviewsTable = (scope: Construct): dynamodb.Table => {
    const movieReviewsTable = new dynamodb.Table(scope, "MovieReviewsTable", {
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
        sortKey: { name: "reviewerName", type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        tableName: "MovieReviews",
    });

    // 在MovieReviews表上添加本地二级索引
    movieReviewsTable.addLocalSecondaryIndex({
        indexName: "reviewIx",
        sortKey: { name: "reviewDate", type: dynamodb.AttributeType.STRING }, // 注意：LSI 必须与表的分区键共享相同的分区键
        projectionType: dynamodb.ProjectionType.ALL,
    });

    return movieReviewsTable;
};
