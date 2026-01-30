#!/bin/bash
# Setup Node.js for SnowRail

echo "🔍 Verificando instalación de Node.js..."

# Check if Homebrew is installed but not in PATH
if [ -f "/opt/homebrew/bin/brew" ]; then
    echo "✅ Homebrew encontrado en /opt/homebrew (Apple Silicon)"
    export PATH="/opt/homebrew/bin:$PATH"
elif [ -f "/usr/local/bin/brew" ]; then
    echo "✅ Homebrew encontrado en /usr/local (Intel Mac)"
    export PATH="/usr/local/bin:$PATH"
else
    echo "❌ Homebrew no encontrado"
    echo ""
    echo "Para instalar Homebrew, ejecuta:"
    echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    echo ""
    echo "Después vuelve a ejecutar este script."
    exit 1
fi

# Check if Node is installed via Homebrew
if [ -f "/opt/homebrew/bin/node" ]; then
    echo "✅ Node.js encontrado en /opt/homebrew/bin/node"
    NODE_PATH="/opt/homebrew/bin"
elif [ -f "/usr/local/bin/node" ]; then
    echo "✅ Node.js encontrado en /usr/local/bin/node"
    NODE_PATH="/usr/local/bin"
else
    echo "❌ Node.js no encontrado"
    echo ""
    echo "Instalando Node.js con Homebrew..."
    brew install node

    if [ -f "/opt/homebrew/bin/node" ]; then
        NODE_PATH="/opt/homebrew/bin"
    elif [ -f "/usr/local/bin/node" ]; then
        NODE_PATH="/usr/local/bin"
    fi
fi

# Add to PATH permanently
echo ""
echo "📝 Configurando PATH en ~/.zshrc..."

if ! grep -q "# SnowRail - Node.js PATH" ~/.zshrc; then
    echo "" >> ~/.zshrc
    echo "# SnowRail - Node.js PATH" >> ~/.zshrc

    if [ -d "/opt/homebrew" ]; then
        echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
    elif [ -d "/usr/local" ]; then
        echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
    fi

    echo "✅ PATH agregado a ~/.zshrc"
else
    echo "✅ PATH ya configurado en ~/.zshrc"
fi

# Reload zshrc
source ~/.zshrc

# Verify installation
echo ""
echo "🔍 Verificando instalación..."
$NODE_PATH/node --version
$NODE_PATH/npm --version

echo ""
echo "✅ Node.js configurado correctamente!"
echo ""
echo "Para que los cambios surtan efecto en esta terminal, ejecuta:"
echo "  source ~/.zshrc"
echo ""
echo "O cierra y vuelve a abrir la terminal."
