/**
 * Quick Diagnostic Script for Orchestrator Issues
 *
 * Usage: Run this in the Metro console or add it to your app temporarily
 *
 * To use:
 * 1. Add this code to a useEffect in DashboardContent.jsx
 * 2. Check console for detailed output
 * 3. Screenshot the output and share with team
 */

// Add this to DashboardContent.jsx temporarily:

useEffect(() => {
  const diagnoseOrchestrator = async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 ORCHESTRATOR DIAGNOSTICS');
    console.log('═══════════════════════════════════════════════════════');

    try {
      // 1. Check authentication
      console.log('\n📝 [1/6] Authentication Check');
      const { userId, isSignedIn } = useAuth();
      console.log(`   Signed In: ${isSignedIn}`);
      console.log(`   User ID: ${userId}`);

      if (!isSignedIn) {
        console.error('   ❌ User is not signed in!');
        return;
      }

      // 2. Check token
      console.log('\n🔐 [2/6] Token Check');
      const token = await user?.getIdToken();
      console.log(`   Token exists: ${!!token}`);
      console.log(`   Token length: ${token?.length || 0}`);

      // 3. Check API client
      console.log('\n🌐 [3/6] API Client Check');
      console.log(`   Base URL: ${apiClient.baseURL}`);
      console.log(`   Health: ${apiClient.isHealthy}`);

      // 4. Test health endpoint
      console.log('\n🏥 [4/6] Backend Health Check');
      try {
        const healthResponse = await fetch(
          `${apiClient.baseURL}/health`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 5000
          }
        );
        console.log(`   Status: ${healthResponse.status}`);
        console.log(`   OK: ${healthResponse.ok}`);
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }

      // 5. Test orchestrator endpoint
      console.log('\n🎯 [5/6] Orchestrator Endpoint Check');
      console.log('   Calling: POST /api/orchestrator/run');

      try {
        const startTime = Date.now();
        const response = await apiClient.post('/orchestrator/run', {});
        const duration = Date.now() - startTime;

        console.log(`   ✅ Success (${duration}ms)`);
        console.log(`   Response keys: ${Object.keys(response).join(', ')}`);
        console.log(`   Decision type: ${response.decision?.type}`);
        console.log(`   Correlations: ${response.correlations?.length || 0}`);
        console.log(`   Lifecycle stage: ${response.lifecycle?.stage}`);
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        console.error(`   Status: ${error.response?.status}`);
        console.error(`   Details: ${JSON.stringify(error.response?.data)}`);
      }

      // 6. Check data in DashboardContent
      console.log('\n📊 [6/6] Dashboard Data Check');
      console.log(`   orchestratorData: ${orchestratorData ? '✅ loaded' : '❌ null'}`);
      console.log(`   orchestratorLoading: ${orchestratorLoading}`);
      console.log(`   hasAnyData: ${hasAnyData}`);
      console.log(`   isOnboarding: ${isOnboarding}`);

      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ Diagnostics Complete');
      console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
      console.error('❌ Diagnostic Error:', error);
    }
  };

  // Run on mount
  diagnoseOrchestrator();
}, []);  // Run once on mount


// ALTERNATIVE: If you can't add to DashboardContent, add a debug button:

// In DashboardContent return JSX, add:
<Button
  title="🔍 Run Diagnostics"
  onPress={async () => {
    const token = await user?.getIdToken();

    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 QUICK DIAGNOSTICS');

    console.log('\n1️⃣ User:', userId);
    console.log('2️⃣ Token:', token ? `${token.slice(0, 20)}...` : 'None');
    console.log('3️⃣ Base URL:', apiClient.baseURL);

    try {
      const resp = await apiClient.post('/orchestrator/run', {});
      console.log('4️⃣ Orchestrator:', resp.decision?.type, resp.correlations?.length, 'patterns');
    } catch (error) {
      console.error('4️⃣ Error:', error.response?.status, error.message);
    }

    console.log('═══════════════════════════════════════════════════════\n');
  }}
  style={{ marginVertical: 10, padding: 10, backgroundColor: '#FF6B6B' }}
/>
