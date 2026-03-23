const express = require("express");
const fetch = require("node-fetch");
const cookieparser = require('cookie-parser');
require("dotenv").config();
const nano = require("nano");
const app = express();
const couch_database = nano(process.env.COUCHDB_URL);
const sessions = require("express-session");
const couch_store = require("connect-couchdb")(sessions);
const is_production = process.env.NODE_ENV === "production";
const default_origins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://generatesaas.netlify.app"
];
const allowed_origins = [
  ...new Set(
    default_origins.concat(
      (process.env.FRONTEND_ORIGIN || "")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean)
    )
  )
];

app.use(express.json());
const the_database = couch_database.db.use('final_year_project');
app.use(cookieparser());
app.set("trust proxy", 1);

app.use((request, response, next) => {
    const origin = request.headers.origin;

    if (origin && allowed_origins.includes(origin)) {
        response.header("Access-Control-Allow-Origin", origin);
        response.header("Vary", "Origin");
        response.header("Access-Control-Allow-Credentials", "true");
        response.header("Access-Control-Allow-Headers", "Content-Type");
        response.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }

    if (request.method === "OPTIONS") {
        return response.sendStatus(204);
    }

    next();
});

    const couchUrl = new URL(process.env.COUCHDB_URL);

app.use(
  sessions({
    secret: process.env.SESSION_SECRET || "the-secret-key",
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
    cookie: {
      secure: is_production,
      sameSite: is_production ? "none" : "lax",
      httpOnly: true
    }
  })
);

    app.get("/health", (request, response) => {
        return response.json({ ok: true });
    });


    app.use(express.static("public"));
    app.post("/user_login", async (request,response) => {
        
        try
        {
            const match = await the_database.find
            ({
            selector: {
            
                username:request.body.username,
                password:request.body.password
            
            }});
            if(!match.docs || match.docs.length === 0)
            {
                return response.json({success:false,message:"no matching username and password found"});
            }
            request.session.username = request.body.username;
            return response.json({success:true , message:"found matching username and password"});
        }
        catch(err)
        {
            console.log("failed to retrieve username and password",err);
            response.status(500).end("error retrieving data");
        }
    })

    // retrieve the latest recommendation from the database
    app.get("/retrieve-recommendations", async(request,response)=>
    {
        try{
            const username = request.session.username;

            if (!username) {
                console.log("User not logged in, session username is undefined");
                return response.json({ output: [] });
            }

            const final_recommendations = await get_user_recommendations(username);
            return response.json({ output: final_recommendations });
        }catch(err){
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
            
            // Fetch user's current ideas and products
            const [ideas_query, products_query] = await Promise.all([
            the_database.find({
                selector: {
                    username: username,
                    ideas: {$exists: true}
                },
                fields: ["ideas"]
            }),
            
            the_database.find({
                selector: {
                    username: username,
                    products: {$exists: true}
                },
                fields: ["products"]
            })
        ]);
            
            const ideas = ideas_query.docs[0]?.ideas || [];
            const products = products_query.docs[0]?.products || [];
            
            if (ideas.length === 0 && products.length === 0) {
                return response.status(400).json({ 
                    error: "No ideas or products found. Please update your profile first." 
                });
            }
            
            console.log("Regenerating recommendations for user:", username);
            console.log("Current ideas:", ideas);
            console.log("Current products:", products);
            
            const existing_recommendations = await get_user_recommendations(username);
            const recommendation_count = existing_recommendations.length > 0 ? existing_recommendations.length : 1;

            // Generate the same number of recommendations the user currently has
            const new_recommendation = await generate_new_recommendation(username, products, ideas, recommendation_count);
            
            return response.json({ 
                success: true, 
                message: "Recommendations regenerated successfully",
                new_recommendation: new_recommendation
            });
            
        } catch (err) {
            console.error("Failed to regenerate recommendations:", err);
            return response.status(500).json({ 
                error: "Failed to regenerate recommendations",
                details: err.message 
            });
        }
    });

    app.post("/register_details", async (request,response)=>
    {
        const username = request.body.username;
        const password = request.body.password;
        const email = request.body.email;
        try
        {
            await the_database.insert({username:username,password:password,email:email});
            console.log("Inserted user's personal details into the database");
            response.json({success: true, message: "data saved successfully"})
        }
        catch(err)
        {
            console.error("error inserting the data into the database",err);
            response.status(400).end("data unsuccessfully inserted into database");
        }
    })

    app.post("/idea_details", async (request,response)=>
    {
        const ideas = request.body.ideas;
        const username = request.body.username;
        try
        {
            await the_database.insert({username:username,ideas:ideas});
            console.log("Inserted user's idea list into the database");
            response.json({success: true, message: "data saved successfully"})
        }
        catch(err)
        {
            console.error("error inserting the data into the database",err);
            response.status(500).end("data unsuccessfully inserted into database");
        }
    })

    app.post("/product_details", async (request,response)=>
    {
        const products = request.body.products
        const username = request.body.username;
        try
        {
            await the_database.insert({username:username,products:products});
            console.log("Inserted user's product portfolio into the database");
            response.json({success: true, message: "data saved successfully"})
        }
        catch(err)
        {
            console.error("error inserting the data into the database",err);
            response.status(400).end("data unsuccessfully inserted into database");
        }
    })

    app.post("/competitor_details",async(request,response)=>{
            const competitors = request.body.competitors;
            const username = request.body.username;
            try
            {
            await the_database.insert({username:username,user_entered_competitors:competitors});
            console.log("Inserted user's competitor details into the database");
            response.json({success: true, message: "data saved successfully"})
            }
            catch(err)
            {
            console.error("error inserting the data into the database",err);
            response.status(400).end("data unsuccessfully inserted into database");
            }
    })

    app.post("/generate_recommendations",async (request,response) => 
    {
            try {
                const username = request.body.username;
                const products = request.body.products;
                const ideas = request.body.ideas;

                const the_products = JSON.stringify(products);
                const the_ideas = JSON.stringify(ideas);


                const api_prompt  = `For this SaaS startup, generate exactly 3 distinct product/service ideas based on this portfolio: ${the_products} and these ideas: ${the_ideas}
                Output exactly:
                1. idea 1 here
                2. idea 2 here
                3. idea 3 here
                Rules:
                1. No intro, summary, or conclusion
                2. Exactly three unique ideas
                3. No text between ideas
                4. No markdown
                5. Do not combine ideas
                6. No extra text before or after the list`;


                const result = await call_api(api_prompt);
            // parse the response and extract the text content

            const message = result?.response?.trim() || "";

            const regex = /\n\s*(?=\d+\.\s)/;
            const three_parts = message.split(regex);
            let parts_array = three_parts
                .map(p => p.trim())
                .filter(p => /^\d+\.\s/.test(p))
                .filter(p => p.length > 0)
                .slice(0, 3);

            // insert the formatted response and the user prompt into the database
            for(let i = 0;i<parts_array.length;i++){
            await the_database.insert({ username,api_prompt,recomm_text: parts_array[i],id: i, date_inserted: new Date().toISOString()});
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
    app.post("/get_competitor_data",async (request,response)=>{
        try
        {
            const username = request.session.username
            const competitors = request.body.competitors;
            const ideas = request.body.ideas;
            const products = request.body.products;

            const check_comp = await the_database.find(
                {
                    selector:
                    {
                        username:username,
                        ai_generated_competitors: {"$exists":true}
                    },
                    fields:
                    [
                        "ai_generated_competitors"
                    ]
                }
            )

            if(check_comp.docs.length >= 1 && check_comp.docs[0].ai_generated_competitors)
            {
                const cached_data =  check_comp.docs[0].ai_generated_competitors
                 return response.json({
                                competitor_data: format_competitor_data(cached_data)
                                });
            }

            const summary_query = await the_database.find({
                selector: {
                    username: username,
                    recomm_text: { "$exists": true }
                },
                fields: ["recomm_text"],
                sort: [{ date_inserted: "desc" }]
            });

            const the_summaries = summary_query.docs.slice(0, 1).map(doc => doc.recomm_text).filter(Boolean);
            const generated_response = await generate_competitor_data(username, products, ideas, competitors, the_summaries);

            const competitor_doc_query = await the_database.find({
                selector: {
                    username: username,
                    user_entered_competitors: { "$exists": true }
                },
                fields: ["_id", "_rev", "username", "user_entered_competitors"]
            });

            if (competitor_doc_query.docs.length >= 1) {
                const competitor_doc = competitor_doc_query.docs[0];
                competitor_doc.ai_generated_competitors = generated_response.competitors;
                await the_database.insert(competitor_doc);
            } else {
                await the_database.insert({
                    username,
                    user_entered_competitors: competitors,
                    ai_generated_competitors: generated_response.competitors
                });
            }

            return response.json({
                competitor_data: format_competitor_data(generated_response.competitors)
             });
                       
                     
        }
        catch(err)
        {
            console.error("Error: ",err);
            return response.status(500).json({ error: "Backend failure", details: err.message }); 

        }
    })

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

                const database_check = await the_database.find(
                    {
                        selector: {
                            username,
                            summary,
                            expanded_text: {"$exists": true}
                        },
                        fields: ["_id", "_rev", "summary", "expanded_text", "full_summary_prompt", "date_inserted"]
                });

                const cached_summary = database_check.docs.find(doc => doc.expanded_text);
                if(cached_summary?.expanded_text)
                {
                    return response.json({output: cached_summary.expanded_text});
                }
          

              const full_summary_prompt =
`Expand this SaaS product/service idea.

Product/service Idea:
${summary}

Output EXACTLY:
1. Expanded Idea: <text>
Market Conditions: <text>
Potential Cost: <text>
Size of Potential Market: <text>
Uniqueness of Product Idea: <text>
Overall Risk Grading: <low/medium/high>
Sources: https://example1.com https://example2.com

RULES:
- Do NOT add any text before "1." or after the final "Sources:" line.
- Do NOT use markdown formatting.
- "Overall Risk Grading" must be low, medium or high.
- Sources MUST contain at least 2 real, reputable URLs related to the product idea or market
- Always include valid sources.
- Sources must be on a single line separated by spaces
- Do NOT change the heading names.
- Do NOT add blank lines anywhere.
`;


                // post the user prompt to the Ollama API
                


            // asynchronously wait for the JSON response
            const result = await call_api(full_summary_prompt);
            // parse the response and extract the text content

            let expanded_summary = result?.response?.trim() || "";

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
    app.post("/logout", async (request,response) =>
    {
        try
        {
            request.session.destroy(err =>{
                if(!err)
                {
                    return response.json({success:true})
                }
                return response.status(500).json({ error: "Failed to process logout" });
            })
        }
        catch(err)
        {
            console.log("Failed end user session",err);
            return response.status(400).end("logout unsuccessful: bad request");
        }
    })

    app.get("/retrieve_details",async (request,response) =>{
        try{
        let user = request.session.username;
        console.log("RAW SESSION USER:", user);
        
        // Check if user is logged in
        if (!user) {
            console.log("User not logged in");
            return response.status(401).json({ error: "User not logged in" });
        }

        user = user.trim();
        console.log("SESSION USER:", JSON.stringify(user));
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
        const ideas_document = ideas_query.docs.find(d => d.ideas && Array.isArray(d.ideas));
        const products_document = product_query.docs.find(d => d.products && Array.isArray(d.products));
        const competitors_document = competitors_query.docs.find(d => Array.isArray(d.user_entered_competitors));
        
        
        // MIGRATION: Normalize old competitor schema to new schema
        

        let compList = competitors_document?.user_entered_competitors || [];


        return response.json({username: personal_details_query.docs[0]?.username || "",
            password: personal_details_query.docs[0]?.password || "",email:personal_details_query.docs[0]?.email || "",ideas: ideas_document?.ideas || [] , 
            products : products_document?.products || [],
            user_entered_competitors : compList})
    }
    catch
    {
        return response.status(500).json({error: "Could not retrieve the user's idea list,product portfolio or entered competitor details"});
    }
    }
)
app.post("/update_profile",async (request,response) =>{

            try{
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
           

        let ideas_document = ideas_query.docs.find(d => d.ideas !== undefined);
        let products_document = product_query.docs.find(d => d.products !== undefined);
        let competitors_document = competitor_query.docs.find(
            d => d.user_entered_competitors !== undefined || d.competitors !== undefined
        );
        const the_summaries = summary_query.docs.map(doc => doc.recomm_text).filter(Boolean);

        if (!ideas_document) 
            { ideas_document = 
                { _id: user + "_ideas", username: user, ideas: [] }; } 
        if (!products_document) 
            { products_document = 
                { _id: user + "_products", username: user, products: [] }; }
         if (!competitors_document) 
            { competitors_document = 
                { _id: user + "_competitors", username: user, competitors: [] }; }
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
        const new_competitors = request.body.competitors

        // Check if ideas or products have actually changed (content or length)
        if(JSON.stringify(old_ideas) !== JSON.stringify(new_ideas) || 
           JSON.stringify(old_products) !== JSON.stringify(new_products))
        {
            changed = true;
        }
        if(changed){
            await generate_new_recommendation(user,new_products,new_ideas,1,false);
        }

        if(JSON.stringify(old_competitors) !== JSON.stringify(new_competitors))
        {

                competitors_document.user_entered_competitors = new_competitors;
                await the_database.insert(competitors_document);
                setImmediate( () => {
            const generated_response = generate_competitor_data(user,new_products,new_ideas,new_competitors,the_summaries );
            generated_response.then(async(generated_response) => {
                competitors_document.ai_generated_competitors = generated_response.competitors;
                await the_database.insert(competitors_document);
            }).catch(error =>{
                console.error(error);
            })
            });
        }
        else{
        competitors_document.user_entered_competitors = new_competitors;
        }


        ideas_document.ideas = new_ideas;
        products_document.products = new_products;
        await the_database.insert(ideas_document);
        await the_database.insert(products_document);

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
            const insights_data = await get_or_generate_accordion_insight(username, product);
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
                unique_products.map(product => get_or_generate_accordion_insight(username, product))
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
        async function parse_competitor_data(competitor_data)
        {
            const trimmed_response = competitor_data.response.trim().match(/{[\s\S]*}/)?.[0] || "{}";
            const parsed_response =  JSON.parse(trimmed_response);
            parsed_response.competitors = parsed_response.competitors.map(c => ({
            competitor_name: c.competitor_name || c.competitor || "",
            market_position: (c.market_position || c.market_pos || "").toLowerCase(),
            source: c.source || "",
            products: (c.products || []).map(p => ({
                product_name: p.product_name || "",
                product_price: p.product_price || p.price_range || "",
                market_share: p.market_share || "",
                items_sold: p.items_sold || "",
                categories: p.categories || []
                }))
            }));

            return parsed_response;
        }
        function format_competitor_data(competitors = [])
        {
            return competitors
                .map((comp, i) => {
                    const product = comp.products?.[0] || {};
                    return `Competitor ${i+1}:
                                Competitor Name: ${comp.competitor_name}
                                Market Position: ${comp.market_position}
                                Product 1:
                                Product Name: ${product.product_name || ""}
                                Product Price: ${product.product_price || ""}
                                Product Market Share: ${product.market_share || ""}
                                Items Sold: ${product.items_sold || ""}
                                Categories: ${(product.categories || []).join(", ")}`;
                })
                .join("\n\n");
        }
        async function get_or_generate_accordion_insight(username, product)
        {
            const insights_query = await the_database.find({
                selector:
                {
                    username,
                    product: product,
                    insights: {"$exists":true}
                },
                fields:
                [
                    "insights"
                ]
            });

            if(insights_query.docs.length >= 1)
            {
                return insights_query.docs[0].insights;
            }

            const insights_prompt =  `
        Based on this SaaS product information:
        ${product}
        
        Output exactly:
        Strengths: <text>
        Weaknesses: <text>
        Sources: https://example1.com https://example2.com

        Rules:
        - Sources must be on the same line and include at least 2 real URLs
        - Use real sources related to the product
        - No text before or after these lines
        - No markdown
        - Do not change the headings
        - No blank lines
        `;
            const insights_data = await call_api(insights_prompt);
            const response_data = insights_data.response;
            await the_database.insert({username:username,prompt:insights_prompt,product:product,insights: response_data});
            return response_data;
        }
        async function generate_competitor_data(username,products,ideas,competitors,the_summaries){
            try{
                const the_products = JSON.stringify(products);
                const the_ideas = JSON.stringify(ideas);

                const competitor_data_prompt = `
            Return only valid JSON in this structure:
                   
                {
                        "competitors": [
                        {
                            "competitor_name": "string",
                            "market_position": "string",
                            "source": "string",
                        "products": [
                        {
                        "product_name": "string",
                        "product_price": "string",
                        "market_share": "string",
                        "items_sold": "string",
                        "categories": ["string"]
                        }
                        ]
                        }

                    ]
                }
                    
                    Based on:
                     LLM recommendation summary: ${the_summaries.join("\n")} 
                     user entered competitors (optional): ${JSON.stringify(competitors || [])}
                     user ideas: ${ideas}
                     user products: ${products} 

                        Rules:
                        1. Competitors must be real SaaS companies
                        2. Return 3-5 competitors
                        3. Return exactly one SaaS product for each competitor
                        4. Market share must be a percentage
                        5. No text outside the JSON
                        6. Categories must match the user's selected product categories
                        7. Source must be one link
                        8. If user entered competitors are provided, use them for better relevance; otherwise infer competitors from the user's ideas and products
                        
                        `;
                const competitor_data =  await call_api(competitor_data_prompt);
               return await parse_competitor_data(competitor_data);




            }catch(err){
                console.log("error generating competitor data",err);
                throw err;
            }
        }
        
        async function get_user_recommendations(username, limit = 4){
            const query = await the_database.find({
                selector:
                {
                    date_inserted: {$exists : true},
                    api_prompt: {"$exists": true },
                    username: username
                },
                fields:
                [
                    "_id",
                    "_rev",
                    "recomm_text",
                    "date_inserted",
                    "id"
                ],
                sort:
                [
                    { date_inserted: "desc" }
                ]
            });

            if(!query.docs || query.docs.length === 0)
            {
                return [];
            }

            const value_array = [];
            const deduplicated_values = query.docs.filter(doc =>
            {
                if (value_array.includes(doc.recomm_text))
                {
                    return false;
                }
                value_array.push(doc.recomm_text);
                return true;
            });

            const complete_recommendations = deduplicated_values.filter(doc => {
                return doc.recomm_text &&
                       !doc.recomm_text.includes("undefined") &&
                       doc.recomm_text.trim().length > 0;
            });

            return complete_recommendations.slice(0, limit);
        }

        function normalize_recommendation_text(text) {
            return String(text || "")
                .replace(/^\d+\.\s*/, "")
                .split(/\s+based on this portfolio:/i)[0]
                .split(/\s+and these ideas:/i)[0]
                .trim();
        }

        async function generate_new_recommendation(username,products,ideas,recommendation_count = 1, replace_existing = true){
             try {

                const the_products = JSON.stringify(products);
                const the_ideas = JSON.stringify(ideas);
                const format_example = Array.from(
                    { length: recommendation_count },
                    (_, index) => `${index + 1}. idea ${index + 1} here`
                ).join("\n                ");


                const api_prompt  = `For this SaaS startup, generate exactly ${recommendation_count} distinct product/service ideas based on this portfolio: ${the_products} and these ideas: ${the_ideas}
                Output exactly:
                ${format_example}
                Rules:
                1. No intro, summary, or conclusion
                2. Exactly ${recommendation_count} unique recommendations
                3. No markdown
                4. No extra text or blank lines before the numbered list
                5. Each recommendation must be on its own numbered line
                  `;
                
                let next_recommendation_id = 0;
                const existing_recomms = await the_database.find({
                    selector: {
                        username: username,
                        recomm_text: {$exists: true}
                    },
                    fields: ["_id", "_rev", "id"]
                });

                if (replace_existing) {
                    for (const doc of existing_recomms.docs) {
                        try {
                            await the_database.destroy(doc._id, doc._rev);
                            console.log("Deleted old recommendation:", doc._id);
                        } catch (err) {
                            console.error("Error deleting old recommendation:", err);
                        }
                    }
                } else {
                    const existing_ids = existing_recomms.docs
                        .map(doc => Number(doc.id))
                        .filter(id => !Number.isNaN(id));
                    next_recommendation_id = existing_ids.length > 0 ? Math.max(...existing_ids) + 1 : existing_recomms.docs.length;
                }
                
                // post the user prompt to the Ollama API
                const result = await call_api(api_prompt);
            // parse the response and extract the text content

            const message = result?.response?.trim() || ""; 

            const regex = /\n\s*(?=\d+\.\s)/; 
            const split_recomm = message.split(regex);
            let formatted_recomm = split_recomm
                .map(p => p.trim())
                .filter(p => /^\d+\.\s/.test(p))
                .map(normalize_recommendation_text)
                .filter(p => p.length > 0)
                .slice(0, recommendation_count);

            if (formatted_recomm.length === 0) {
                const fallback_recommendation = normalize_recommendation_text(message);
                if (fallback_recommendation) {
                    formatted_recomm = [fallback_recommendation];
                }
            }
            // insert the formatted response and the user prompt into the database

            for(let i = 0; i < formatted_recomm.length; i++)
            {
                await the_database.insert({
                    username,
                    api_prompt,
                    recomm_text: formatted_recomm[i],
                    id: replace_existing ? i : next_recommendation_id + i,
                    date_inserted: new Date().toISOString()
                });
            }
            console.log("Inserted document:", { username,api_prompt,formatted_recomm});
            
            // if no content is included in the response
            if(formatted_recomm.length === 0)
            {
                console.log("content is empty");
            }
            else
            {
                // return the content to the front-end in JSON form
                return formatted_recomm;
            }
            } catch (err) {
                console.error("Error inserting prompt to database",err);
                throw err;
            }
        }
       
         async function call_api(prompt)
        {
                const huggingface_token = process.env.HF_TOKEN;

                if (huggingface_token) {
                    const huggingface_model = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";
                    const resp = await fetch(`https://api-inference.huggingface.co/models/${huggingface_model}`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${huggingface_token}`
                        },
                        body: JSON.stringify({
                            inputs: prompt,
                            parameters: {
                                return_full_text: false,
                                max_new_tokens: 700,
                                temperature: 0.4
                            }
                        })
                    });

                    console.log("Hugging Face response status:", resp.status);

                    if (!resp.ok) {
                        const error_text = await resp.text();
                        console.error("Hugging Face API error:", error_text);
                        throw new Error(error_text);
                    }

                    const result = await resp.json();
                    const generated_text = Array.isArray(result)
                        ? result[0]?.generated_text
                        : result?.generated_text;

                    if (!generated_text) {
                        console.error("Unexpected Hugging Face result:", result);
                        throw new Error("No generated text returned from Hugging Face");
                    }

                    return { response: generated_text };
                }

                const ollama_url = process.env.OLLAMA_URL || "http://localhost:11434";
                const resp = await fetch(`${ollama_url}/api/generate`, {
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

            if (!resp.ok) 
            {
            const error_text = await resp.text();
            console.error("Model API error:", error_text);
            throw new Error(error_text);
            }

            const result = await resp.json();
            console.log("Ollama result: ",result);
            return result;
        }
         if(require.main === module){
        const port = process.env.PORT || 3000;
        app.listen(port, ()=>
        {
            console.log(`listening on port ${port}`)
        }
        );
    }
    module.exports = app;
