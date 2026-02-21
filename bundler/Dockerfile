FROM node:20-slim

RUN npm install -g pnpm

WORKDIR /app

# Clone and build Alto bundler
RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="/root/.foundry/bin:${PATH}"
RUN foundryup

RUN git clone https://github.com/pimlicolabs/alto.git .
RUN pnpm install
RUN pnpm build:contracts
RUN pnpm build

# Expose bundler port
EXPOSE 4337

# Start bundler with ADI testnet configuration
CMD ["sh", "-c", "./alto run \
  --entrypoints $ENTRYPOINT_ADDRESS \
  --executor-private-keys $BUNDLER_PRIVATE_KEY \
  --utility-private-key $BUNDLER_PRIVATE_KEY \
  --rpc-url $RPC_URL \
  --min-balance 0 \
  --safe-mode false \
  --port 4337"]
