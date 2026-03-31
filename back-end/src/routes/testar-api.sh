#!/bin/bash
# Execute: bash testar-api.sh
# Testa todos os endpoints que o dashboard precisa

BASE="http://localhost:3001"
OK="\033[0;32m✓\033[0m"
FAIL="\033[0;31m✗\033[0m"

echo ""
echo "========================================="
echo "  DIAGNÓSTICO DE ENDPOINTS DO DASHBOARD"
echo "========================================="
echo ""

check() {
  local label="$1"
  local url="$2"
  local code
  code=$(curl -s -o /tmp/resp.json -w "%{http_code}" "$url" 2>/dev/null)
  
  if [ "$code" = "200" ]; then
    # Pega primeiros 80 chars da resposta
    local preview
    preview=$(cat /tmp/resp.json | head -c 80 | tr '\n' ' ')
    echo -e "$OK  [$code] $label"
    echo "       → $preview..."
  else
    echo -e "$FAIL  [$code] $label"
    echo "       URL: $url"
    if [ -s /tmp/resp.json ]; then
      echo "       Erro: $(cat /tmp/resp.json | head -c 120)"
    fi
  fi
  echo ""
}

echo "── ENDPOINTS NOVOS (analytics) ──────────────────────────"
check "KPI"              "$BASE/api/analytics/kpi"
check "Por Ano"          "$BASE/api/analytics/por-ano"
check "Por Mês (2024)"   "$BASE/api/analytics/por-mes?data_ini=2024-01-01&data_fim=2024-12-31"
check "Top Clientes"     "$BASE/api/analytics/top-clientes?limit=3"
check "Top Materiais"    "$BASE/api/analytics/top-materiais?limit=3"
check "Top Vendedores"   "$BASE/api/analytics/top-vendedores?limit=3"
check "Por Grupo"        "$BASE/api/analytics/por-grupo"

echo "── ENDPOINTS DE FILTROS (novos) ─────────────────────────"
check "Filtros/Anos"      "$BASE/api/filtros/anos"
check "Filtros/Clientes"  "$BASE/api/filtros/clientes"
check "Filtros/Vendedores""$BASE/api/filtros/vendedores"
check "Filtros/Materiais" "$BASE/api/filtros/materiais"
check "Filtros/Grupos"    "$BASE/api/filtros/grupos"

echo "── ENDPOINTS EXISTENTES (devem continuar OK) ────────────"
check "Faturamento"       "$BASE/api/faturamento?pageSize=2"
check "Health"            "$BASE/health"
check "Filtros/UFs"       "$BASE/api/filtros/ufs"
check "Filtros/Mercados"  "$BASE/api/filtros/mercados"

echo "========================================="
echo "  SE VER ✗ 404 = endpoint não existe ainda"
echo "  SE VER ✗ 500 = erro de SQL no Firebird"  
echo "  SE VER ✓ 200 = tudo certo!"
echo "========================================="
