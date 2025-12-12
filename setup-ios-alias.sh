#!/bin/bash

# Liftr iOS Development Aliases
# Run this once: bash setup-ios-alias.sh

echo "Setting up Liftr iOS aliases..."

# Check if .zshrc exists
if [ ! -f ~/.zshrc ]; then
    touch ~/.zshrc
fi

# Add aliases if they don't exist
if ! grep -q "liftr-ios" ~/.zshrc; then
    echo "" >> ~/.zshrc
    echo "# Liftr iOS Development Aliases" >> ~/.zshrc
    echo 'alias liftr-ios="cd /Users/mani.k/Documents/Liftr && bash -c \"export NVM_DIR=\\\"\$HOME/.nvm\\\" && source \\\"\$NVM_DIR/nvm.sh\\\" && nvm use 22 && npx cap open ios\""' >> ~/.zshrc
    echo 'alias liftr-sync="cd /Users/mani.k/Documents/Liftr && bash -c \"export NVM_DIR=\\\"\$HOME/.nvm\\\" && source \\\"\$NVM_DIR/nvm.sh\\\" && nvm use 22 && npx cap sync ios\""' >> ~/.zshrc
    echo 'alias liftr-build="cd /Users/mani.k/Documents/Liftr && bash -c \"export NVM_DIR=\\\"\$HOME/.nvm\\\" && source \\\"\$NVM_DIR/nvm.sh\\\" && nvm use 22 && npm run build && npx cap sync ios && npx cap open ios\""' >> ~/.zshrc
    echo "" >> ~/.zshrc
    
    echo "✅ Aliases added to ~/.zshrc"
    echo ""
    echo "Run: source ~/.zshrc"
    echo ""
    echo "Then use these commands:"
    echo "  liftr-ios     - Open Xcode with iOS project"
    echo "  liftr-sync    - Sync changes to iOS"
    echo "  liftr-build   - Full build + sync + open"
else
    echo "⚠️  Aliases already exist in ~/.zshrc"
fi

echo ""
echo "Done! 🎉"

