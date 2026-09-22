# From member risk to a retention plan

For my bachelor's thesis in Business Informatics, I designed and implemented an AI agent prototype in cooperation with ACISO Consulting and ELEMENTS Fitness.

The question was practical: how could a fitness team use the member data already available to decide who might need attention and what to do next?

## What I built

I built a Next.js frontend and a Python backend using Google ADK. The interface combines a dashboard with a chat workflow. An employee can ask about a member or a group, inspect risk information and request a retention plan.

The agent uses tools to retrieve data from BigQuery. A separate tool requests feature contributions from BigQuery ML, and a retrieval tool searches a retention knowledge corpus. The plan workflow turns this information into a proposal that can be reviewed, saved and exported as a PDF.

The source includes the agent instructions, tool implementations, state models and interface. Reproducing the full system requires the corresponding data schema and cloud services.

## A typical workflow

An employee starts with members who have a high recorded risk score. They inspect the available explanation and ask for a retention plan. The proposal gives the team a starting point for a conversation and follow-up.

## Why it is relevant to customer success

The project connects a technical system to a recurring customer-facing task. Its output has to be understandable enough for a person to decide on a next step. That involves explaining a risk signal, making the recommendation reviewable and fitting the result into the team's workflow.

An employee's conversation with a member can reveal context absent from the database. A high score should trigger review, not an automatic decision about that person.

## What the project establishes

This is evidence of a prototype design and its implementation. It is not evidence of a measured reduction in churn or a production rollout. Model explanations describe model output; they do not establish the cause of a member's behavior. Financial projections in the prototype are assumptions, not observed business results.

This repository omits the original research data and private development history. Static examples use synthetic values. Offline tests cover selected software components, not the quality of the underlying predictions.
