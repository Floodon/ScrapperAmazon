const amazonScraper = require('amazon-buddy');
const S3 = require('aws-sdk/clients/s3');
const { availableCountries, categories } = require('./constants');
const { Parser } = require('@json2csv/plainjs');

const s3 = new S3({
    region: "eu-west-1",
});

const util = require('util')

/**
 * Maps products by category to a flat array of products
 * @param {*} productsByCategory 
 * @returns 
 */
function parseProductsByCategory(productsByCategory) {
    const parsedProducts = [];
    for (const [category, products] of Object.entries(productsByCategory)) {
        // console.log({ category, products })
        if (!products.result) {
            continue;
        }

        for (const product of products.result) {
            parsedProducts.push({
                productID: product.asin,
                productCategory: category,
                productDate: new Date().toISOString(),
                currentURL: product.url,
                promotion: product.price.discounted ? 1 : 0,
                productName: product.title,
                productPrice: product.price.current_price,
                productPricePrevious: product.price.before_price,
                productRating: product.reviews.rating,
            })
        }
    }
    return parsedProducts;
}

/**
 * Main lambda function
 * @returns {Promise<{ statusCode: number, body: string }>}
 */
exports.handler = async () => {
    const productsByCountry = await fetchProductsByCountries();

    console.log({ productsByCountry })

    const parser = new Parser({ delimiter: ';', fields: ['productID', 'productDate', 'productCategory', 'currentURL', 'promotion', 'productName', 'productPrice', 'productPricePrevious', 'productRating'] });
    // upload files to s3
    for await (const [country, productsByCategory] of Object.entries(productsByCountry)) {
        const date = new Date().toISOString().split('T')[0];
        const parsedProducts = parseProductsByCategory(productsByCategory);
        console.log({ parsedProducts })
        const csvFile = parser.parse(parsedProducts);
        const fileName = `${date}-${country}-products.csv`;
        const fileParams = {
            Bucket: 'sin-d1-redshift-data-ingest',
            Key: fileName,
            Body: csvFile,
            ContentType: "application/csv",
        };
        const response = await s3.upload(fileParams).promise();
        console.log({ response })
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'fetched products by country',
        }),
    };
}

/**
 * Fetch Amazon products by country and category
 * @returns {Promise<Record<string, Record<string, { result: { asin: string, url: string, title: string, price: { current_price: number, before_price: number, currency: string, discounted: boolean }, reviews: { rating: number, count: number } }[] }>>>}
 */
async function fetchProductsByCountries() {

    const productsByCountry = Object.fromEntries(await Promise.all(availableCountries.map(async country => {
        return [country, Object.fromEntries(await Promise.all(categories.map(async category => {
            console.log({ country, category })
            try {
                const products = await amazonScraper.products({ keyword: category, country });
                return [category, products]
            } catch (error) {
                console.log({ country, category, error })
                return [category, {}]
            }
        })))]
    })));


    console.log(util.inspect(productsByCountry, { showHidden: false, depth: 2, colors: true }))
    return productsByCountry;
}

/**
 * Get all categories by country. Not used for now.
 * @returns {Promise<Record<string, Record<string, { name: string, url: string }>>>}
 */
async function getCategoriesByCountry() {
    const categoriesByCountry = Object.fromEntries(await Promise.all(availableCountries.map(async country => {
        try {
            const categories = await amazonScraper.categories({ country });
            return [country, categories]
        } catch (error) {
            console.log({ error })
            return [country, {}]
        }
    })));
    console.log(util.inspect(categoriesByCountry, { showHidden: false, depth: 2, colors: true }))
    return categoriesByCountry;
}
