#!/bin/bash

# IBOM Tech Week - Setup Script
echo "🚀 IBOM Tech Week Setup"
echo "======================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual credentials!"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
pnpm exec prisma generate

echo ""
echo "📊 Database Setup"
echo "================="
echo ""
echo "Choose your database setup option:"
echo "1) I have a PostgreSQL database URL ready"
echo "2) I want to use a local PostgreSQL database"
echo "3) I'll set this up later"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Great! Please ensure your DATABASE_URL is set in .env"
        echo ""
        read -p "Run database migration now? (y/n): " migrate
        if [ "$migrate" = "y" ] || [ "$migrate" = "Y" ]; then
            echo "🗄️  Running database migration..."
            pnpm exec prisma migrate dev --name init
        fi
        ;;
    2)
        echo ""
        echo "Setting up local PostgreSQL..."
        echo "Please ensure PostgreSQL is installed and running"
        echo ""
        read -p "Enter database name (default: ibom_tech_week): " dbname
        dbname=${dbname:-ibom_tech_week}
        
        read -p "Enter PostgreSQL username (default: postgres): " dbuser
        dbuser=${dbuser:-postgres}
        
        read -p "Enter PostgreSQL password: " dbpass
        
        # Update .env file
        sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://${dbuser}:${dbpass}@localhost:5432/${dbname}?schema=public\"|" .env
        rm .env.bak 2>/dev/null
        
        echo ""
        echo "Creating database..."
        createdb -U $dbuser $dbname 2>/dev/null || echo "Database might already exist"
        
        echo ""
        echo "🗄️  Running database migration..."
        pnpm exec prisma migrate dev --name init
        ;;
    3)
        echo ""
        echo "⏭️  Skipping database setup"
        echo "Remember to set up your database later and run:"
        echo "  pnpm exec prisma migrate dev --name init"
        ;;
    *)
        echo "Invalid choice. Skipping database setup."
        ;;
esac

echo ""
echo "✨ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with payment API keys"
echo "2. (Optional) Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for geocoding"
echo "3. Run 'pnpm dev' to start the development server"
echo "4. Run 'pnpm exec prisma studio' to view your database"
echo ""
echo "📚 Check IMPLEMENTATION_SUMMARY.md for detailed documentation"
echo ""
