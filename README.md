# Fantasy FRC Draft System

A comprehensive fantasy sports platform for FIRST Robotics Competition (FRC) teams. Draft teams, manage rosters, track performance, and compete in leagues with advanced analytics and trading features.

## 🚀 Features Overview

### ✅ Phase 1: Basic Draft System (COMPLETED)
- User authentication and registration
- Create and join draft rooms
- Real-time draft interface with pick timer
- Snake draft format support
- Public and private room options

### ✅ Phase 2: Team Integration (COMPLETED)
- FRC team database with 9,000+ teams
- Team search and filtering
- Integration with The Blue Alliance API
- Team statistics and information display

### ✅ Phase 3: Enhanced Draft Features (COMPLETED)
- Advanced draft room management
- Pick history and draft analytics
- Improved user interface
- Draft room status tracking

### ✅ Phase 4: Player Management (COMPLETED)
- Fantasy scoring system based on FRC performance
- Event and team performance tracking
- Roster management with starting lineups
- Weekly scoring calculations

### ✅ Phase 5: League Management & Scoring (COMPLETED)
- Comprehensive league standings
- Advanced analytics and insights
- Weekly performance tracking
- Team performance projections
- League analytics dashboard

### ✅ Phase 6: Advanced Features & Integrations (COMPLETED)
- **Trading System**: Player-to-player team trades
- **Waiver Wire**: Pick up/drop teams during season
- **Notifications**: Real-time alerts and updates
- **Mobile API**: Optimized endpoints for mobile apps
- **Data Sync**: Automated TBA integration
- **Advanced Analytics**: League insights and engagement metrics

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Convex (real-time database and functions)
- **Authentication**: NextAuth.js
- **Deployment**: Vercel
- **External APIs**: The Blue Alliance (TBA) API

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Convex account

### 1. Clone the Repository
```bash
git clone <repository-url>
cd my-app
npm install
```

### 2. Environment Setup
Create a `.env.local` file:
```env
# Convex
NEXT_PUBLIC_CONVEX_URL=your_convex_url
CONVEX_DEPLOY_KEY=your_convex_deploy_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# The Blue Alliance API
TBA_API_KEY=your_tba_api_key
```

### 3. Database Setup
```bash
# Deploy Convex schema
npx convex deploy

# Seed with sample data (optional)
npm run seed-data
```

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🎮 Usage Guide

### Getting Started
1. **Sign Up/Login**: Create an account or sign in
2. **Browse Teams**: Explore the FRC team database
3. **Create Draft**: Set up a new draft room
4. **Invite Players**: Share room code with friends
5. **Draft Teams**: Participate in real-time draft
6. **Manage Roster**: Set starting lineups and track performance

### Draft Room Management
- **Create Room**: Configure settings (public/private, team count, pick timer)
- **Join Room**: Use room codes or browse public rooms
- **Draft Interface**: Real-time picking with automatic turn progression
- **Snake Format**: Alternating pick order each round

### Fantasy Scoring System
Teams earn points based on FRC event performance:
- **Base Points**: 12 points for event participation
- **Qualification**: +2 per win, -1 per loss (normalized to 10 matches)
- **Playoffs**: +1 for making playoffs, +0.33 per win, -0.25 per loss

### League Features
- **Standings**: Weekly and season-long rankings
- **Analytics**: Score distributions, trends, and insights
- **Projections**: AI-powered team performance predictions
- **History**: Track individual and league performance over time

### Advanced Features (Phase 6)
- **Trading**: Propose and accept team trades with other users
- **Waiver Wire**: Claim available teams based on priority order
- **Notifications**: Get alerts for trades, scores, and league updates
- **Mobile API**: Access optimized endpoints for mobile applications

## 🧪 Testing & Demo

### Demo Pages
- **Phase 5 Demo**: `/admin/phase5-demo` - Test league management features
- **Phase 6 Demo**: `/admin/phase6-demo` - Test advanced features

### Sample Data
Run the seeding script to populate with realistic test data:
```bash
npm run seed-data
```

This adds:
- 20 competitive FRC teams
- 2023 and 2024 event data
- Realistic performance statistics
- Weekly scoring calculations

### Testing Workflow
1. **Seed Data**: Run seeding script
2. **Create Draft**: Set up test draft room
3. **Draft Teams**: Complete a draft with multiple users
4. **Set Lineups**: Configure starting rosters
5. **Calculate Scores**: Use Phase 5 demo to process weekly scores
6. **View Analytics**: Check league standings and analytics
7. **Test Trading**: Use Phase 6 demo to test advanced features

## 📊 API Reference

### Key Endpoints

#### Draft Management
- `api.draft.createDraftRoom` - Create new draft room
- `api.draft.joinDraftRoom` - Join existing room
- `api.draft.makePick` - Make draft pick
- `api.draft.getDraftState` - Get current draft state

#### Team & Performance
- `api.teams.listTeams` - Get team list with filtering
- `api.playerManagement.recordTeamEventPerformance` - Record event results
- `api.playerManagement.calculateWeeklyScores` - Calculate weekly points

#### League Management
- `api.playerManagement.getLeagueStandings` - Get league standings
- `api.playerManagement.getLeagueAnalytics` - Get detailed analytics
- `api.playerManagement.getUserLeagueHistory` - Get user performance

#### Advanced Features
- `api.playerManagement.initiateTrade` - Start team trade
- `api.playerManagement.addToWaiverWire` - Add waiver claim
- `api.playerManagement.createNotification` - Send notification
- `api.playerManagement.getMobileDashboard` - Mobile dashboard data

## 🏗️ Architecture

### Database Schema
- **Users**: Authentication and profile data
- **Teams**: FRC team information and statistics
- **DraftRooms**: Draft configuration and state
- **DraftPicks**: Individual draft selections
- **PlayerRosters**: User team ownership and lineups
- **Events**: FRC competition events
- **TeamEventPerformances**: Team results at events
- **WeeklyTeamScores**: Aggregated weekly scoring
- **LeagueWeeklyScores**: Fantasy league scoring
- **TradeProposals**: Team trading system
- **WaiverClaims**: Waiver wire management
- **Notifications**: User alert system

### Real-time Features
- Live draft updates using Convex subscriptions
- Automatic turn progression and pick timers
- Real-time roster and scoring updates
- Live notifications and trade alerts

## 🚀 Deployment

### Vercel Deployment
1. Connect repository to Vercel
2. Configure environment variables
3. Deploy with automatic builds

### Convex Deployment
```bash
npx convex deploy --prod
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 Development Roadmap

### Future Enhancements
- [ ] **Phase 7**: Mobile App (React Native)
- [ ] **Phase 8**: Advanced AI Analytics
- [ ] **Phase 9**: Tournament Brackets
- [ ] **Phase 10**: Social Features & Communities

### Potential Features
- Multi-season league support
- Custom scoring systems
- Team performance predictions
- Social media integration
- Commissioner tools
- Advanced statistics
- Export/import functionality

## 🐛 Troubleshooting

### Common Issues
1. **Convex Connection**: Ensure `NEXT_PUBLIC_CONVEX_URL` is correct
2. **Authentication**: Check NextAuth configuration
3. **TBA API**: Verify API key and rate limits
4. **Seeding Errors**: Ensure database schema is deployed

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=true
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **FIRST Robotics Competition** for the amazing program
- **The Blue Alliance** for comprehensive FRC data
- **Convex** for real-time database infrastructure
- **Vercel** for hosting and deployment
- **FRC Community** for inspiration and feedback

---

**Built with ❤️ for the FRC Community**

For questions, issues, or feature requests, please open an issue on GitHub.
