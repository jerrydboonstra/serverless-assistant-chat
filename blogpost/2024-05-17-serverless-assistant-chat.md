# Prototyping a sophisticated multi-user Chat Assistant, using AWS Lambda and OpenAI Assistant API with TypeScript

<img src="https://raw.githubusercontent.com/jerrydboonstra/serverless-assistant-chat/blogpost1/images/developer.webp" alt="Logog" style="width:50%;">

*some prompt engineering goes a long way*

## Introduction

As a CTO, you're likely aware of the immense potential for automating repetitive tasks involving information retrieval and summarization. Large Language Models (LLMs) have opened new frontiers for automation, and Retrieval-Augmented Generation ([RAG](https://aws.amazon.com/what-is/retrieval-augmented-generation/)) is a powerful technique that enhances these capabilities by combining large language models with external data sources.

If you're considering building a custom chat assistant using the OpenAI Assistant API and AWS Lambda, you're on the right track. These tools can fast-track your development process and help you avoid common pitfalls. In this article, we'll delve into the nuts and bolts of creating a multi-user chat assistant with these technologies, providing you with a clear roadmap for building and continuously improving your solution.

### The journey building a robust assistant 

A fully implemented continuous improvement process for LLM-based applications looks like this:

<img src="https://raw.githubusercontent.com/jerrydboonstra/serverless-assistant-chat/blogpost1/images/cycle.png" alt="cycle" style="width:75%;">

It takes a lot of effort to build a *full* pipeline, but you have to *start* somewhere, right?

### Starting your journey


Here is a suggested timeline of steps you will go through to get the *most* robust solution using LLM, starting from zero:

0. Have enough of an understanding of your problem to be able to describe a process to solve it in natural language.
1. Do iterative system prompt engineering until you get something that works most of the time. 
    - This can be done in the [OpenAI Assistant Playground](https://platform.openai.com/playground/assistants), probably the quickest way to prove the concept.
        - for most deterministic output use lowest temperature (t=0)
    - Sprinkle in as much [RAG](https://aws.amazon.com/what-is/retrieval-augmented-generation/) scope as your application needs
        - sometimes this is the ability for a user to upload documents, sometimes its administratively adding 100 documents to the assistant instance as a global reference source.
    - You will eventually hit a good enough threshold that you can stop adding more prompts and start using the model.
1. **Build a prototype application** (🎉 *the topic of this article!* 🎉)
    - Include the ability to store the interactions in a database and a way for a user to rate responses.
    - ***Put it in front of users***
        - This will allow you to gather the data you will need in the future for evals
1. Continue to record and evaluate the results of iterative refinements to the system prompt
1. Eventually you will hit a wall trying to get improvements this way. 
Either determine that is good enough or you want even better results. 
    - if you want better results, **now its time for fine-tuning**
1. Create a suite of [DPO](https://huggingface.co/papers/2305.18290) evals, using data gathered in previous steps.
1. Fine-tune a new foundational LLM - maybe [open source](https://huggingface.co/collections/meta-llama/meta-llama-3-66214712577ca38149ebb2b6)? - with the same system prompt against your DPO eval data
    - Start with an [Adapter Fine-Tuning](https://aclanthology.org/2023.emnlp-main.319/), like [LoRA](https://www.answer.ai/posts/2024-04-26-fsdp-qdora-llama3.html#lora) or [qLoRA](https://arxiv.org/abs/2305.14314).
    - Consider more advanced techniques such as [DoRA](https://www.answer.ai/posts/2024-04-26-fsdp-qdora-llama3.html#dora) or [qDoRA](https://www.answer.ai/posts/2024-04-26-fsdp-qdora-llama3.html#code-and-models).
1. Move on to more advanced techniques and a full continuous improvement pipeline: our virtuous cycle established.

## Building our prototype application

Now that we have a vision, its time to do some architecting of our multi-user prototype.

### Why Serverless?

Choosing a serverless architecture offers several advantages for our chat assistant:

- **Cost Efficiency**: You only pay for what you use, making it cost-effective for applications with variable traffic.
- **Scalability**: Serverless platforms automatically scale to handle demand, ensuring your application remains responsive under load.
- **Maintenance-Free**: You don't have to worry about managing servers, allowing you to focus on development.

However, it's essential to be aware of the limitations, such as execution timeouts and cold start delays, which we’ll address in detail.

### Why OpenAI?

OpenAI’s Assistant API is a robust tool for creating sophisticated chatbots. Since its release, it has introduced features like:

- **State Management**: Maintain conversation context across multiple interactions.
- **Knowledge Augmentation**: Access up to 10,000 reference documents to enrich your chatbot’s responses.
- **Code Execution**: Execute code snippets generated during conversations, adding a layer of dynamic interaction.
- **Function Calling**: Enables real-time calls to external functions or APIs
- **Streaming Output**: Streams partial results for immediate feedback.
- **Ability to use fine-tuned models**: Allows tailoring responses through model fine-tuning.

These features enable us to build a powerful, flexible chat assistant with a wide range of applications.

### Can we build it?

When looking at building our assistant using serverless, limitations that need to be addressed and worked around include 

| **Aspect**                        | **Limitation**                                                                                                                                                        | **Observation/Workaround**                                                                                                                                                                                            |
|-----------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Execution Timeout**             | API Gateway has a maximum execution timeout for synchronous connections of around 30 seconds.                                                                        | The vast majority of single turn responses will execute in under 30 seconds. For others, we depend on websockets auto-reconnect and the stateful and idempotent nature of the Assistant API.                           |
| **Execution Context Persistence** | State, data, etc. are not preserved across invocations, except for the `/tmp` directory and in-memory variables within a single container.                          | Leverage the stateful nature of the Assistant API. Use DynamoDB for tracking the assistant thread used per user across stateless Lambda invocations.                                                                  |
| **Library and Dependency Management** | Some Python libraries, especially those requiring native dependencies, may be difficult to install and use in Lambda. There is a limit of 5 layers.                    | OpenAI NodeJs SDK has no native dependencies. We use a Lambda layer to provide this library and its dependencies to our application backend.                                                                          |
| **Memory and CPU Limitations**    | Lambda functions can only allocate up to 10 GB of memory, and CPU performance is proportional to the memory allocated.                                              | A Lambda function for our purposes is unlikely to need more than 1 GB of memory, and in practice use less. Inferencing can be memory and GPU intensive, but it is done in the OpenAI infrastructure.                   |
| **Deployment Package Size**       | Deployment package size cannot exceed 50MB when uploaded directly, or 250MB using an Amazon S3 bucket.                                                               | OpenAI library and dependencies weigh in ~17MB uncompressed which leaves 233MB of headroom for other libraries for your lambda application.                                                                                        |
| **Cold Start Delays**             | Cold start delays are the latency experienced when executing a serverless application (such as AWS Lambda) for the first time after being idle.                      | Usually not a deal breaker for low traffic applications. Can be mitigated by keeping functions warm, increasing function memory allocation, or using Provisioned Concurrency.                                         |


### Our Architecture

<img src="https://raw.githubusercontent.com/jerrydboonstra/serverless-assistant-chat/blogpost1/images/arch.png" alt="arch" style="width:75%;">

## Let's Go!

Code can be found at [https://github.com/jerrydboonstra/serverless-assistant-chat](https://github.com/jerrydboonstra/serverless-assistant-chat)

You'll need:
- an AWS account with wide permissions, to be able to deploy entire CloudFormation stacks with serverless components.
- an OpenAI account and API key, for storing your Assistant instance and for billing.

After cloning the codebase, we'll need to 

- create our local environment
- create our Assistant instance
- create our backend deployment bucket

before running our CloudFormation template to create our stack.

### Setup and Deployment

- Clone the repo

    `git clone https://github.com/jerrydboonstra/serverless-assistant-chat.git`

- Follow instructions in [README.md](https://github.com/jerrydboonstra/serverless-assistant-chat/blob/blogpost/README.md) to create a local environment and deploy the entire Assistant stack in your AWS environment.

### Try it out!

<img src="https://raw.githubusercontent.com/jerrydboonstra/serverless-assistant-chat/blogpost1/images/screengrab2.gif" alt="screengrab" style="width:75%;">

### Making changes after stack deployment

There is a provided process to make changes after deployment, allowing iterative development.

## Costs 

### OpenAI
Assistants API can be used with a selection of models which vary in cost and quality.

By default, this project uses `gpt-4o` model, to demo its humorous example prompt.

`3.5-turbo` gives a 10x cost savings. Overall it will come down to your use case whether you can get away with the ultralow cost solution. 

Since an assistant instance is easy to spin up or modify using our codebase, you can easily change models and compare results to quickly determine which direction to go in.

The details:
- You can get great results using `gpt-4o` but - at the time of writing - at inference you’ll be paying 
    - `$5` per `1M` tokens for input and `$15` per `1M` tokens for output.
- For an ultra-low cost solution you can choose `gpt-3.5-turbo` which isn't free but is getting close: inference is 
    - `$0.50` per `1M` tokens for input and `$1.50` per `1M` tokens for output. 

### AWS

For lower traffic application, its unlikely you will exceed the free tier.


## Summary

Creating a custom multi-user chat assistant using AWS Lambda and the OpenAI Assistant API offers a robust, scalable, and cost-effective solution for automating complex tasks. 

We have outlined a clear roadmap, starting from understanding your problem and engaging in iterative prompt engineering, through to developing a prototype and fine-tuning models for advanced capabilities. Leveraging serverless architecture ensures you can efficiently scale while maintaining flexibility and reducing operational overhead.

Embarking on this journey requires careful planning and execution, but the rewards of building a sophisticated chat assistant are substantial.  By following the guidelines and tips shared here, you'll be well-equipped to develop a highly functional assistant tailored to your specific needs.

Best of luck with your project!

# TODO 

#### doc

1. update all github raw links to use main branch instead of blogpost
1. Add example output from each CLI step in README
