#!/bin/bash

# ZendFi SDK Test Setup Script

set -e

echo "🔧 ZendFi SDK Test Environment Setup"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠  .env file not found${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env from template${NC}"
    echo ""
fi

# Check if backend is running
echo "Checking ZendFi backend..."
BACKEND_URL="${ZENDFI_BASE_URL:-https://api.zendfi.tech}"
if curl -s "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running at ${BACKEND_URL}${NC}"
else
    echo -e "${YELLOW}⚠  Could not reach backend at ${BACKEND_URL}${NC}"
    echo "   Tests may fail if the backend is not accessible"
    echo ""
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Check environment variables
echo ""
echo "Checking configuration..."

if grep -q "your_api_key_here" .env; then
    echo -e "${YELLOW}⚠  Please configure your API key in .env${NC}"
    echo "   Edit the .env file and add your ZendFi API key"
    echo ""
    exit 1
fi

if grep -q "your_webhook_secret_here" .env; then
    echo -e "${YELLOW}⚠  Please configure your webhook secret in .env${NC}"
    echo "   (Optional - only needed for webhook tests)"
    echo ""
fi

echo -e "${GREEN}✓ Configuration looks good!${NC}"
echo ""
echo "Ready to run tests!"
echo ""
echo "Available test commands:"
echo -e "${BLUE}  npm test${NC}              - Run all tests"
echo -e "${BLUE}  npm run test:payment${NC}  - Test payment creation"
echo -e "${BLUE}  npm run test:payment-link${NC} - Test payment links"
echo -e "${BLUE}  npm run test:webhook${NC}  - Test webhook verification"
echo ""
