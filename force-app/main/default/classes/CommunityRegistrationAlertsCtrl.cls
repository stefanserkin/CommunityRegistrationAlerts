public with sharing class CommunityRegistrationAlertsCtrl {
    
    @AuraEnabled(cacheable=true)
    public static String getSessionId() {
        return UserInfo.getSessionId();
    }
    
}