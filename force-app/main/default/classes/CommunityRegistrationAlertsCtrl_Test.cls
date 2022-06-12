@isTest
private class CommunityRegistrationAlertsCtrl_Test {
    
    @isTest
    static void testGetSessionId() {

        System.assertEquals(
            UserInfo.getSessionId(), 
            CommunityRegistrationAlertsCtrl.getSessionId(),
            'Returned session id does not match session'
        );

    }

}