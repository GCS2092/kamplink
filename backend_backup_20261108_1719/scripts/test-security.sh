#!/bin/bash

# Script de test des fonctionnalités de sécurité
# Usage: ./test-security.sh [BASE_URL]

BASE_URL="${1:-http://localhost:3000/api/v1}"

echo "=========================================="
echo "🛡️  Test des Fonctionnalités de Sécurité"
echo "=========================================="
echo "URL de test: $BASE_URL"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Compteurs
PASSED=0
FAILED=0

# Fonction de test
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -n "Testing: $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} ($http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} (expected $expected_status, got $http_code)"
        ((FAILED++))
    fi
}

echo "1️⃣  Health Check"
echo "----------------"
test_endpoint "GET" "/health" "" "200" "Health endpoint accessible"
echo ""

echo "2️⃣  Rate Limiting - Login"
echo "------------------------"
for i in {1..6}; do
    test_endpoint "POST" "/auth/login" '{"idToken":"invalid"}' "401" "Login attempt $i/6"
done
echo ""

echo "3️⃣  Validation des Données"
echo "------------------------"
test_endpoint "POST" "/auth/forgot-password" '{}' "400" "Forgot password sans données"
test_endpoint "POST" "/auth/forgot-password" '{"email":"invalid"}' "400" "Forgot password email invalide"
test_endpoint "POST" "/auth/reset-password" '{"token":"test","newPassword":"weak"}' "400" "Reset password mot de passe faible"
echo ""

echo "4️⃣  Routes Publiques"
echo "-------------------"
test_endpoint "GET" "/users/universites" "" "200" "Liste des universités"
echo ""

echo "5️⃣  Format de Réponse"
echo "--------------------"
echo -n "Testing: Format JSON standardisé... "
response=$(curl -s "$BASE_URL/health")
if echo "$response" | grep -q '"success"' && echo "$response" | grep -q '"timestamp"'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} (missing success/timestamp fields)"
    ((FAILED++))
fi
echo ""

echo "=========================================="
echo "📊 Résultats des Tests"
echo "=========================================="
echo -e "Réussis: ${GREEN}$PASSED${NC}"
echo -e "Échoués: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les tests ont réussi !${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Certains tests ont échoué.${NC}"
    exit 1
fi
