#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ZendFi E-Commerce Template Setup     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo -e "${YELLOW}  .env file already exists!${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Setup cancelled.${NC}"
        exit 1
    fi
fi

# Copy .env.example to .env
echo -e "${BLUE} Creating .env file...${NC}"
cp .env.example .env

# Generate NEXTAUTH_SECRET
echo -e "${BLUE} Generating NEXTAUTH_SECRET...${NC}"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
sed -i "s|{{NEXTAUTH_SECRET}}|$NEXTAUTH_SECRET|g" .env
echo -e "${GREEN}✓ NEXTAUTH_SECRET generated${NC}"

# Prompt for ZendFi API Key
echo ""
echo -e "${YELLOW} ZendFi Configuration${NC}"
echo -e "${BLUE}Get your API key from: https://dashboard.zendfi.com${NC}"
read -p "Enter your ZendFi API Key: " ZENDFI_API_KEY
sed -i "s|{{API_KEY}}|$ZENDFI_API_KEY|g" .env
echo -e "${GREEN}✓ ZendFi API Key set${NC}"

# Prompt for Webhook Secret
read -p "Enter your ZendFi Webhook Secret: " ZENDFI_WEBHOOK_SECRET
sed -i "s|{{WEBHOOK_SECRET}}|$ZENDFI_WEBHOOK_SECRET|g" .env
echo -e "${GREEN}✓ Webhook Secret set${NC}"

# Prompt for Environment
echo ""
echo -e "${YELLOW}Select environment:${NC}"
echo "1) development (testnet)"
echo "2) production (mainnet)"
read -p "Choose (1/2): " ENV_CHOICE
if [ "$ENV_CHOICE" = "2" ]; then
    sed -i "s|{{ENVIRONMENT}}|production|g" .env
    echo -e "${GREEN}✓ Environment set to production${NC}"
else
    sed -i "s|{{ENVIRONMENT}}|development|g" .env
    echo -e "${GREEN}✓ Environment set to development${NC}"
fi

echo ""
echo -e "${GREEN} Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review your .env file and update any additional settings"
echo "2. Run: npm install"
echo "3. Run: npm run db:push"
echo "4. Run: npm run db:seed"
echo "5. Run: npm run dev"
echo ""
echo -e "${BLUE}Happy coding! ${NC}"
