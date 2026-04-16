const express = require("express");
const fetch = require("node-fetch");
const cookieparser = require('cookie-parser');
require("dotenv").config();
const nano = require("nano");
const bcrypt = require("bcryptjs");
const app = express();
const couch_database = nano(process.env.COUCHDB_URL);
const sessions = require("express-session");
const couch_store = require("connect-couchdb")(sessions);
const {
    buildRecommendationsPrompt,
    buildRecommendationsRetryPrompt,
    buildFullSummaryPrompt,
    buildInsightsPrompt,
    buildCompetitorPrompt
} = require("./promptTemplates"); // get all the prompts used in the application
const {
    generateRankedRecommendations,
    getUserRecommendations,
    generateNewRecommendation
} = require("../server/recommendationHelpers"); // recommendation parsing and ranking helpers
const {
    formatCompetitorData,
    getOrGenerateAccordionInsight,
    generateCompetitorData
} = require("../server/competitorHelpers"); // competitor parsing and insight helpers

app.use(express.json());
const the_database = couch_database.db.use('final_year_project'); // specify the database used
app.use(cookieparser()); // enable use of cookies for session management

    const couchUrl = new URL(process.env.COUCHDB_URL);
// use the sessions middleware, with session data including the name, host, port etc of the CouchDB instance.
app.use(
  sessions({
    secret: "the-secret-key",
    saveUninitialized: false,
    resave: false,
    store: new couch_store({
      name: "sessions",
      host: couchUrl.hostname,
      port: couchUrl.port || 5984,
      protocol: couchUrl.protocol.replace(":", ""),
      username: couchUrl.username,
      password: couchUrl.password
    }),
    cookie: { secure: false } // set cookie to be non secure for development purposes ( HTTPS NOT USED IN DEVELOPMENT )
  })
);


    app.use(express.static("public")); // serve static files from the public directory

    
// process the user login post request
    app.post("/user_login", async (request,response) => {
        
        try
        {
            // find that documents containing that users username and password in the database
            const match = await the_database.find
            ({
            selector: {
                username:request.body.username, // username included in the request body
                password: {"$exists": true} // password exists for the user
            },
            fields: ["_id", "_rev", "username", "password"]});
            if(!match.docs || match.docs.length === 0) // if no matching username and password
            {
                return response.json({success:false,message:"no matching username and password found"}); // return message indicating unsuccessful login
            }
            const user_document = match.docs[0]; // grab the first matching document from the query
            const stored_password = user_document.password || ""; // extract stored password from document
            const valid_password = stored_password.startsWith("$2") // if password starts with $2 ( is hashed with bcrypt) it should be compared with bcrypt otherwise password can be compared directly
                ? await bcrypt.compare(request.body.password, stored_password)
                : stored_password === request.body.password;
            if (!valid_password) // if password is not valid, indicate no matching username and password
            {
                return response.json({success:false,message:"no matching username and password found"});
            }
            if (!stored_password.startsWith("$2")) // if the password is not hashed
            {
                user_document.password = await bcrypt.hash(request.body.password, 10); // hash the password
                await the_database.insert(user_document); // store the document in the database
            }
            request.session.username = request.body.username; // set the session username as the username in the request body
            return response.json({success:true , message:"found matching username and password"}); // indicate match found
        }
        catch(err) // if request fails, indicate error
        {
            console.log("failed to retrieve username and password",err);
            response.status(500).end("error retrieving data");
        }
    })

    // retrieve the latest recommendation from the database
    app.get("/retrieve-recommendations", async(request,response)=>
    {
        try{
            const username = request.session.username; // store the session username in a variable

            if (!username) {
                console.log("User not logged in, session username is undefined");
                return response.json({ output: [] });
            }

            const final_recommendations = await getUserRecommendations(the_database, username); // get the latest stored recommendations for this user
            return response.json({ output: final_recommendations }); // return the recommendations
        }catch(err){ // if error retrieving recommendations, indicate error
            console.log("failed to retrieve recommendations from the database",err);
            return;
        };
    });

    app.post("/regenerate-recommendations", async (request, response) => {
        try {
            const username = request.session.username;
            
            // Check if user is logged in
            if (!username) {
                console.log("User not logged in");
                return response.status(401).json({ error: "User not logged in" });
            }
            
            // Fetch user's current ideas and products for generating new recommendations
            const [ideas_query, products_query] = await Promise.all([
            the_database.find({
                selector: {
                    username: username,
                    ideas: {$exists: true} // ideas exists for the user
                },
                fields: ["ideas"]
            }),
            
            the_database.find({
                selector: {
                    username: username,
                    products: {$exists: true} // products exist for the user
                },
                fields: ["products"]
            })
        ]);
            
            const ideas = ideas_query.docs[0]?.ideas || []; // extract the ideas or an empty array if no ideas are found
            const products = products_query.docs[0]?.products || []; // extract the products or an empty array if no products are found
            
            if (ideas.length === 0 && products.length === 0) { // if products and ideas are not found
                return response.status(400).json({ 
                    error: "No ideas or products found. Please update your profile first." 
                }); // return error status
            }
            
            console.log("Regenerating recommendations for user:", username);
            console.log("Current ideas:", ideas);
            console.log("Current products:", products);
            
            const existing_recommendations = await getUserRecommendations(the_database, username); // grab the existing database recommendations
            const recommendation_count = existing_recommendations.length > 0 ? existing_recommendations.length : 1; // initialise the recommendation count 

            // Generate the same number of recommendations the user currently has
            const new_recommendation = await generateNewRecommendation({
                database: the_database,
                username,
                products,
                ideas,
                recommendationCount: recommendation_count,
                buildRecommendationsPrompt,
                buildRecommendationsRetryPrompt,
                callApi: app.call_api
            });
            
            return response.json({ 
                success: true, 
                message: "Recommendations regenerated successfully",
                new_recommendation: new_recommendation // return the new recommendations
            });
            
        } catch (err) { // indicate failure to regenerate recommendations and return error message
            console.error("Failed to regenerate recommendations:", err);
            return response.status(500).json({ 
                error: "Failed to regenerate recommendations",
                details: err.message 
            });
        }
    });
    // post user registration details asynchronously
    app.post("/register_details", async (request,response)=>
    {
        const username = request.body.username; // get the username from the request body
        const password = request.body.password; // get the password from the request body
        const email = request.body.email; // get the email from the request
        try
        {
            const hashed_password = await bcrypt.hash(password, 10); // hash the password
            await the_database.insert({_id: username + "_profile",username:username,password:hashed_password,email:email}); // store the username. hashed password and email in the database
            console.log("Inserted user's personal details into the database");
            response.json({success: true, message: "data saved successfully"})
        }
        catch(err)
        {
            console.error("error inserting the data into the database",err);
            response.status(400).end("data unsuccessfully inserted into database");
        }
    })

    // POST idea list details to the database
    app.post("/idea_details", async (request,response)=>
    {
        const ideas = request.body.ideas;
        const username = request.body.username;
        if (!username) {
            return response.status(400).end("username required");
        }
        if (!Array.isArray(ideas)) {
            return response.status(400).end("ideas must be an array");
        }
        try
        {
            await the_database.insert({_id: username + "_ideas",username:username,ideas:ideas}); // insert the ideas belonging to a particular user to the database
            console.log("Inserted user's idea list into the database");
            response.json({success: true, message: "data saved successfully"}) // indicate success
        }
        catch(err)
        {
            console.error("error inserting the data into the database",err);
            response.status(500).end("data unsuccessfully inserted into database");
        }
    })

    // POST product portfolio details to the database
    app.post("/product_details", async (request,response)=>
    {
        const products = request.body.products
        const username = request.body.username;
        if (!username) {
            return response.status(400).end("username required");
        }
        if (!Array.isArray(products)) {
            return response.status(400).end("products must be an array");
        }
        try
        {
            await the_database.insert({_id: username + "_products",username:username,products:products}); // insert the product portfolio of that user in the database
            console.log("Inserted user's product portfolio into the database");
            response.json({success: true, message: "data saved successfully"})
        }
        catch(err)
        {
            console.error("error inserting the data into the database",err);
            response.status(400).end("data unsuccessfully inserted into database");
        }
    })

    // POST user entered competitor details to the database
    app.post("/competitor_details",async(request,response)=>{
            const competitors = request.body.competitors;
            const username = request.body.username;
            if (!username) {
                return response.status(400).end("username required");
            }
            if (!Array.isArray(competitors)) {
                return response.status(400).end("competitors must be an array");
            }
            try
            {
            await the_database.insert({_id: username + "_competitors",username:username,user_entered_competitors:competitors}); // insert competitor details in the database
            console.log("Inserted user's competitor details into the database");
            response.json({success: true, message: "data saved successfully"})
            }
            catch(err)
            {
            console.error("error inserting the data into the database",err);
            response.status(400).end("data unsuccessfully inserted into database");
            }
    })
    // POST the generated recommendations to the database
    app.post("/generate_recommendations",async (request,response) => 
    {
            try {
                const username = request.body.username;
                const products = request.body.products;
                const ideas = request.body.ideas;

                const api_prompt = buildRecommendationsPrompt(ideas, products, 3); // build the prompt, passing in the idea list, product portfolio and number of recommendations 
                const retry_prompt = buildRecommendationsRetryPrompt(ideas, products, 3); // build the fallback prompts
                const parts_array = await generateRankedRecommendations({
                    ideas,
                    products,
                    recommendationCount: 3,
                    prompt: api_prompt,
                    retryPrompt: retry_prompt,
                    callApi: app.call_api
                }); // generate the three highest ranked recommendations

            // insert the formatted response and the user prompt into the database
            for(let i = 0;i<parts_array.length;i++){
            await the_database.insert({ username,api_prompt,recomm_text: parts_array[i],id: i, date_inserted: new Date().toISOString()}); // insert each recommendation with a timestamp for each
            console.log("Inserted document:", { username,api_prompt, part:i+1});
            }

            // if no content is included in the response
            if(parts_array.length === 0)
            {
                console.log("content is empty");
            }
            else
            {
                // return the content to the front-end in JSON form
                response.json({output: parts_array});
            }
            } catch (err) {
                console.error("Error inserting prompt to database",err);
            }
        
        });
        // POST method to retrieve the competitor data from the database
    app.post("/get_competitor_data",async (request,response)=>{
        try
        {
            // get the username, competitors, ideas and products included 
            const username = request.session.username
            const competitors = request.body.competitors;
            const ideas = request.body.ideas;
            const products = request.body.products;

            if (!Array.isArray(competitors) || !Array.isArray(ideas) || !Array.isArray(products)) {
            return response.status(400).json({ error: "Missing or invalid fields" });
            }

        // Accept either raw competitor-name strings or saved competitor objects from the profile data.
        const normalizedCompetitors = competitors.map(competitor => {
            if (typeof competitor === "string") {
                return competitor;
            }
            if (competitor && typeof competitor === "object") {
                return competitor.competitor || competitor.name || "";
            }
            return "";
        });

        // Remove whitespace-only competitors after normalising the payload.
        const cleanedCompetitors = normalizedCompetitors
            .filter(c => typeof c === "string" && c.trim().length > 0);

        // Reject mixed or empty competitor entries after normalisation.
        if (cleanedCompetitors.length !== normalizedCompetitors.length) {
            return response.status(400).json({ error: "Competitor names must be non-empty strings" });
            }

            // query to find LLM generated competitor data tied to a specific user
            const check_comp = await the_database.find(
                {
                    selector:
                    {
                        username:username,
                        ai_generated_competitors: {"$exists":true} // LLM generated competitor data exists
                    },
                    fields:
                    [
                        "ai_generated_competitors"
                    ]
                }
            )
            // if there is at least one document found and it has competitor data
                    if (check_comp.docs.length >= 1 && check_comp.docs[0].ai_generated_competitors) {
                        const cached_data = check_comp.docs[0].ai_generated_competitors;

                        const formatted = formatCompetitorData(cached_data);

                        return response.json({
                            competitor_data: Array.isArray(formatted) ? formatted : []
                        });
                    }

            // grab all of the recommendations from the database sorted in descending order
            const summary_query = await the_database.find({
                selector: {
                    username: username,
                    recomm_text: { "$exists": true }
                },
                fields: ["recomm_text"],
                sort: [{ date_inserted: "desc" }]
            });

            const the_summaries = summary_query.docs.slice(0, 1).map(doc => doc.recomm_text).filter(Boolean); // extract only one of the recommendations and remove any false values (null or undefined)
            let generated_response = await generateCompetitorData({
                username,
                products,
                ideas,
                competitors: cleanedCompetitors,
                summaries: the_summaries,
                buildCompetitorPrompt,
                callApi: app.call_api
            }); // generate the competitor data 

            if (
                !generated_response ||
                typeof generated_response !== "object" ||
                !Array.isArray(generated_response.competitors)
            ) {
                generated_response = { competitors: [] };
            }

            // query to retrieve the user entered competitor data
            const competitor_doc_query = await the_database.find({
                selector: {
                    username: username,
                    user_entered_competitors: { "$exists": true } // user entered competitor data exists
                },
                fields: ["_id", "_rev", "username", "user_entered_competitors"]
            });

            // if there is at least one document found containing user entered competitor data
            if (competitor_doc_query.docs.length >= 1) {
                const competitor_doc = competitor_doc_query.docs[0];
                competitor_doc.ai_generated_competitors = generated_response.competitors; // save  user entered competitors in the same document as the ai generated competitors
                try {
                await the_database.insert(competitor_doc);
            } catch (err) {
                if (err.statusCode === 409) {
                    const existing = await the_database.get(competitor_doc._id);
                    competitor_doc._rev = existing._rev;
                    await the_database.insert(competitor_doc);
                } else {
                    throw err;
                }
            } // insert the competitor details into the database
            } else { // if the user never entered competitor data
                await the_database.insert({ // insert a new document containing the user entered and ai-generated competitors
                    username,
                    user_entered_competitors: cleanedCompetitors,
                    ai_generated_competitors: generated_response.competitors
                });
            }

            return response.json({
                competitor_data: formatCompetitorData(generated_response.competitors) // return the formatted competitor data
             });
                       
                     
        }
        catch(err) // if failure to retrieve the data, indicate error
        {
            console.error("Error: ",err);
            return response.status(500).json({ error: "Backend failure", details: err.message }); 

        }
    })
    // post route to generate and retrieve a full expanded recommendation summary
    app.post("/retrieve_full_summary",async (request,response) =>
    {
        console.log("retrieve_full_summary route HIT");
        console.log("username:", request.session.username);
        console.log("summary:", request.body.summary);
        console.log("id:", request.body.id);


        try {
                const username = request.session.username;
                const summary = request.body.summary;
                const id = Number(request.body.id);

                // check if the expanded summary already exists for that user in the database
                const database_check = await the_database.find(
                    {
                        selector: {
                            username,
                            summary,
                            expanded_text: {"$exists": true}
                        },
                        fields: ["_id", "_rev", "summary", "expanded_text", "full_summary_prompt", "date_inserted"]
                });

                const cached_summary = database_check.docs.find(doc => doc.expanded_text); // grab the exact document that contains the expanded text
                if(cached_summary?.expanded_text) // if cached expanded summary exists
                {
                    return response.json({output: cached_summary.expanded_text}); // return the summary
                }
          

              const full_summary_prompt = buildFullSummaryPrompt(summary); // build the prompt for generating the full summary

                

            // asynchronously wait for the JSON response
            const result = await app.call_api(full_summary_prompt);
            // parse the response and extract the text content

            // trim the whitespace from the summary, if there is no expanded summary assign it as an empty string
            let expanded_summary = result?.response?.trim() || "";

            // convert expanded summary to string
            expanded_summary = String(expanded_summary).trim();



            console.log("Returning expanded summary:", expanded_summary);

            // insert the formatted response and the user prompt into the database
            await the_database.insert({ username,full_summary_prompt,summary, expanded_text: expanded_summary,id, date_inserted: new Date().toISOString()});
            console.log("Inserted document:", { username,full_summary_prompt,expanded_text:expanded_summary});
                // return the content to the front-end in JSON form
                 return response.json({output: expanded_summary});
            } catch (err) {
                console.error("Error: ",err);
                return response.status(500).json({ error: "Backend failure", details: err.message }); 
            }
        
        });
    // POST route to handle user logout 
    app.post("/logout", async (request,response) =>
    {
        try
        {
            // destroy the user session
            request.session.destroy(err =>{
                if(!err)
                {
                    return response.json({success:true}) // return success message
                }
                return response.status(500).json({ error: "Failed to process logout" }); // indicate error logging out
            })
        }
        catch(err)
        {
            console.log("Failed end user session",err);
            return response.status(400).end("logout unsuccessful: bad request");
        }
    })

    // retriev the user details
    app.get("/retrieve_details",async (request,response) =>{
        try{
        let user = request.session.username;
        console.log("RAW SESSION USER:", user);
        
        // Check if user is logged in
        if (!user) {
            console.log("User not logged in");
            return response.status(401).json({ error: "User not logged in" });
        }

        user = user.trim(); // trim the whitespace
        console.log("SESSION USER:", JSON.stringify(user));
        const stable_profile = await the_database.get(user + "_profile").catch(() => null); // get the user profile
        const stable_ideas = await the_database.get(user + "_ideas").catch(() => null); // get the user ideas
        const stable_products = await the_database.get(user + "_products").catch(() => null); // get the user products
        const stable_competitors = await the_database.get(user + "_competitors").catch(() => null); // get the user competitors

        if (stable_profile || stable_ideas || stable_products || stable_competitors) { // if any stable cached profile data exists for the user
            return response.json({
                username: stable_profile?.username || "",
                password: "", // password returned as empty string for security reasons
                email: stable_profile?.email || "", // email or empty string if doesnt exist
                ideas: stable_ideas?.ideas || [], // ideas or empty array if it doesnt exist
                products: stable_products?.products || [], // products or empty if no products are found
                user_entered_competitors: stable_competitors?.user_entered_competitors || stable_competitors?.competitors || [] // user entered products or empty array if not found
            });
        }
        // query the ideas, products, personal details, competitors and return all responses in one go
        const[ideas_query,product_query,personal_details_query,competitors_query] =  await Promise.all([
        the_database.find({
          selector:
          {
                 username : user,
                 ideas: {$exists: true}
                 
          },
          fields:
          [
                "ideas",
                "username"
          ]
        }),
        the_database.find({
            selector:
          {
                 username : user,
                 products: {$exists: true}
                 
          },
          fields:
          [
                "products",
                "username"
          ]
        }),

        the_database.find({
            selector:
            {
                username: user,
                password: {"$exists": true},
                email: {"$exists": true}
            },
            fields:
            [
                "username",
                "password",
                "email"
            ]
        }),
        the_database.find({
          selector:
          {
                 username : user,
                 user_entered_competitors: {$exists: true}
                 
          },
          fields:
          [
                "user_entered_competitors",
                "username"
          ]
        })
    ]);
        
        // Find documents that actually have the ideas, products, and competitors fields
        const ideas_document = ideas_query.docs.find(d => d.ideas && Array.isArray(d.ideas)); // extract ideas where the ideas are an array
        const products_document = product_query.docs.find(d => d.products && Array.isArray(d.products)); // extract products where the products are an array
        const competitors_document = competitors_query.docs.find(d => Array.isArray(d.user_entered_competitors)); // extract user entered competitors where the competitors are in an array
        
        // MIGRATION: Normalize old competitor schema to new schema 

        let compList = competitors_document?.user_entered_competitors || []; // get the user entered competitors, or null if they do not exist


        return response.json({username: personal_details_query.docs[0]?.username || "",
            password: "",email:personal_details_query.docs[0]?.email || "",ideas: ideas_document?.ideas || [] , 
            products : products_document?.products || [],
            user_entered_competitors : compList}) // return the details
    }
    catch
    {
        return response.status(500).json({error: "Could not retrieve the user's idea list,product portfolio or entered competitor details"});
    }
    }
)

// POST route for handling user profile updates
app.post("/update_profile",async (request,response) =>{

            try{
                // Validate input
                const { ideas, products, competitors } = request.body;

                if (!Array.isArray(ideas) || !Array.isArray(products) || !Array.isArray(competitors)) {
                    return response.status(400).json({ error: "Missing or invalid fields" });
                }

                // Remove whitespace-only competitors
                // Normalise competitor entries (accept strings OR objects)
                const cleanedCompetitors = competitors
                    .map(c => {
                        if (!c) return ""; // handles null/undefined

                        if (typeof c === "string") {
                            return c.trim();
                        }

                        if (typeof c === "object") {
                            // Try all possible fields your UI might send
                            const name =
                                c.competitor ||        // <-- THIS is the field your frontend uses
                                c.competitorName ||
                                c.name ||
                                c.title ||
                                c.productName ||
                                "";

                            return String(name).trim();
                        }

                        return "";
                    })
                    .filter(name => name.length > 0);

                // Reject only if *all* competitors are invalid
                if (competitors.length > 0 && cleanedCompetitors.length === 0) {
                    return response.status(400).json({
                        error: "Competitor names must be non-empty strings or objects with a name field"
                    });
                }


                // query the profile details
                const [ideas_query, product_query,competitor_query,summary_query] = await Promise.all([
                    the_database.find({
                        selector: {
                            username: request.session.username,
                            ideas: { $exists: true }
                        },
                        fields: ["_id", "_rev", "ideas", "username"]
                    }),
                    the_database.find({
                        selector: {
                            username: request.session.username,
                            products: { $exists: true }
                        },
                        fields: ["_id", "_rev", "products", "username"]
                    }),
                    the_database.find({
                        selector: {
                            username: request.session.username,
                            user_entered_competitors: { $exists: true }
                        },
                        fields: ["_id", "_rev", "user_entered_competitors", "competitors", "username"]
                    }),
                    the_database.find({
                        selector: {
                            username: request.session.username,
                            recomm_text: { $exists: true }
                        },
                        fields: ["recomm_text"]
                    })
                ]);
                const user = request.session.username;
           

        let ideas_document = ideas_query.docs.find(d => d.ideas !== undefined); // grab the ideas where they have been defined
        let products_document = product_query.docs.find(d => d.products !== undefined); // grab the products where they have been defined
        let competitors_document = competitor_query.docs.find(
            d => d.user_entered_competitors !== undefined || d.competitors !== undefined // grab the competitors where they have been defined
        );
        const the_summaries = summary_query.docs.map(doc => doc.recomm_text).filter(Boolean); // grab the recommendation text

        if (!ideas_document) 
            { ideas_document = 
                { _id: user + "_ideas", username: user, ideas: [] }; } 
        if (!products_document) 
            { products_document = 
                { _id: user + "_products", username: user, products: [] }; }
         if (!competitors_document) 
            { competitors_document = 
                { _id: user + "_competitors", username: user, user_entered_competitors: [] }; }
        else if (!competitors_document.user_entered_competitors && !competitors_document.competitors)
        {
            competitors_document.user_entered_competitors = [];
        }

        const old_ideas = ideas_document?.ideas || [];
        const old_products = products_document?.products || [];
        const old_competitors = competitors_document?.user_entered_competitors || competitors_document?.competitors || [];
        let changed =  false;

        const new_ideas = request.body.ideas;
        const new_products =  request.body.products;
        const new_competitors = cleanedCompetitors

        // Check if ideas or products have actually changed (content or length)
        if(JSON.stringify(old_ideas) !== JSON.stringify(new_ideas) || 
           JSON.stringify(old_products) !== JSON.stringify(new_products))
        {
            changed = true;
        }
        // generate new recommendation if the ideas and products are different
        if(changed){
            await generateNewRecommendation({
                database: the_database,
                username: user,
                products: new_products,
                ideas: new_ideas,
                recommendationCount: 1,
                replaceExisting: false,
                buildRecommendationsPrompt,
                buildRecommendationsRetryPrompt,
                callApi: app.call_api
            });
        }
        // if competitor details are different
        if(JSON.stringify(old_competitors) !== JSON.stringify(new_competitors))
        {

                competitors_document.user_entered_competitors = new_competitors; // assign the new competitor data to the old data
                try {
                        await the_database.insert(competitors_document);
                    } catch (err) {
                        if (err.statusCode === 409) {
                            const existing = await the_database.get(competitors_document._id);
                            competitors_document._rev = existing._rev;
                            await the_database.insert(competitors_document);
                        } else {
                            throw err;
                        }
                    }
 // insert the new document into the database
                setImmediate( () => {
                    // generate new competitor data using the new values
            const generated_response = generateCompetitorData({
                username: user,
                products: new_products,
                ideas: new_ideas,
                competitors: new_competitors,
                summaries: the_summaries,
                buildCompetitorPrompt,
                callApi: app.call_api
            });
            generated_response.then(async(generated_response) => {
                competitors_document.ai_generated_competitors = generated_response.competitors; // assign the new data as the LLM generated data to be displayed in the modal
                try {
                await the_database.insert(competitors_document);
            } catch (err) {
                if (err.statusCode === 409) {
                    const existing = await the_database.get(competitors_document._id);
                    competitors_document._rev = existing._rev;
                    await the_database.insert(competitors_document);
                } else {
                    throw err;
                }
            } // insert the document into the database
            }).catch(error =>{
                console.error(error);
            })
            });
        }
        else{
        competitors_document.user_entered_competitors = new_competitors; // assign the new data as the old data
        }


        ideas_document.ideas = new_ideas;
        products_document.products = new_products;
            try {
                await the_database.insert(ideas_document);
            } catch (err) {
                if (err.statusCode === 409) {
                    const existing = await the_database.get(ideas_document._id);
                    ideas_document._rev = existing._rev;
                    await the_database.insert(ideas_document);
                } else {
                    throw err;
                }
            }

            try {
                await the_database.insert(products_document);
            } catch (err) {
                if (err.statusCode === 409) {
                    const existing = await the_database.get(products_document._id);
                    products_document._rev = existing._rev;
                    await the_database.insert(products_document);
                } else {
                    throw err;
                }
            }


        return response.json({success:true});

    }
    catch(err)
    {
        return response.status(500).json({error:err.message});
    } 
    });
    app.post("/retrieve_accordion_data",async (request,response)=>{
        try{
            const product = request.body.competitor_product;
            const username = request.session.username;
            const insights_data = await getOrGenerateAccordionInsight({
                database: the_database,
                username,
                product,
                buildInsightsPrompt,
                callApi: app.call_api
            });
            response.json({insights_data});
        }
        catch(err)
        {
            console.error("Failed to retrieve accordion insight", err);
            response.status(500).json({error:"Failed to retrieve accordion insight"});
        }
    });
    app.post("/retrieve_accordion_data_batch", async (request, response) => {
        try{
            const username = request.session.username;
            const products = Array.isArray(request.body.products) ? request.body.products : [];
            const unique_products = Array.from(new Set(products.filter(Boolean)));
            const insights_data = await Promise.all(
                unique_products.map(product => getOrGenerateAccordionInsight({
                    database: the_database,
                    username,
                    product,
                    buildInsightsPrompt,
                    callApi: app.call_api
                }))
            );
            return response.json({insights_data});
        }
        catch(err)
        {
            console.error("Failed to retrieve accordion insights batch", err);
            return response.status(500).json({error:"Failed to retrieve accordion insights batch"});
        }
    });
    app.post("/post_feedback",async (request,response)=>{
        try{
            const rec_id = request.body.recommendation_id;
            const rating = request.body.star_rating;
            const text = request.body.feedback;
            const username = request.session.username

            const check_feedback = await the_database.find(
            {selector:
                {
                    rec_id:rec_id,
                    username
                },
                fields:
                [
                    "rec_id"
                ]

            }
        )
            if(check_feedback.docs.length >= 1)
            {
                return response.json({previously_submitted:true});
            }

            await the_database.insert({username:username,rec_id:rec_id,star_rating:rating,feedback_text:text});
            return response.json({message: "successfully submitted recommendation rating"});
        }
        catch(err)
        {
            console.error("Failed to send feedback to the backend",err);
            return response.status(500).json({error:"Failed to send feedback to the backend"});
        }
    })
    app.get("/retrieve_feedback_status",async(request,response)=>{
        const username = request.session.username
        
        // Check if user is logged in
        if (!username) {
            console.log("User not logged in");
            return response.status(401).json({error:"User not logged in"});
        }
        
        try{
        const submitted = await the_database.find(
            {selector:
                {
                    rec_id:{"$exists":true},
                    username
                },
                fields:
                [
                    "rec_id"
                ]

            }
        
        )
        const ids = submitted.docs.map(doc => doc.rec_id);
        return response.json({submitted_response:ids});
    }
    catch(err)
    {
        console.error("Failed to retrieve submission status", err);
        return response.status(500).json({error:"Failed to retrieve submission status"})
    }
    })
        app.call_api = async function call_api(prompt)
        {
            // test mode override (fast deterministic responses)
            if (process.env.NODE_ENV === "test" && typeof app.call_apiMock === "function") {
                return app.call_apiMock(prompt);
            }

            // post the user prompt to the OpenRouter API
            const resp = await fetch("http://localhost:11434/api/generate", {
                method: "POST",
                headers: {
                "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3",
                    prompt: prompt,
                    stream: false
                })
            });

            console.log("Ollama response status:", resp.status);

            if (!resp.ok) {
                const error_text = await resp.text();
                console.error("Model API error:", error_text);
                throw new Error(error_text);
            }

            const result = await resp.json();
            console.log("Ollama result: ", result);
            return result;
        }
         if(require.main === module){
        app.listen(3000, ()=>
        {
            console.log("listening on port 3000")
        }
        );
    }
    module.exports = app;
    module.exports.call_api = app.call_api;
