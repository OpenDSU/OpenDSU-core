module.exports = {
    ctor: function (userId, name, email, phone, publicDescription, secretToken, userDID, isPrivate) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.publicDescription=publicDescription;
        this.isPrivate = isPrivate;
        this.availableInvitesCounter = 0;
        this.acceptedInvites = [];
        this.followedBrands= [];
        this.secretToken=secretToken;
        this.userDID = userDID;
        /* the email and phone are private by default */
        this.isPrivate = true;
        //this.secretToken=secretToken;
        this.friends = [];
    },
    actions: {
        update: function (userId, name, email, phone, publicDescription, secretToken, userDID,  isPrivate) {
            this.name = name;
            this.email = email;
            this.userId = userId;
            this.phone = phone;
            this.publicDescription=publicDescription;
            this.secretToken=secretToken;
            this.userDID = userDID;
            this.isPrivate = isPrivate;
        },
        setTemporarySecretToken(temporarySecretToken){
          this.temporarySecretToken=temporarySecretToken;
        },
        registeredAsValidatedUser: function () {
            this.availableInvitesCounter += 10;
        },
        addInvites: function (invites) {
            this.availableInvitesCounter += invites;
        },
        inviteAccepted: function (inviteId) {
            this.availableInvitesCounter--;
            this.acceptedInvites.push(inviteId);
            this.friends.push(inviteId);
        },
        addFriend: function (friendId) {
            this.friends.push(friendId);
        },
        addBrandToFollowed(brandId)
        {
          this.followedBrands.push(brandId);
        },
        removeBrandFromFollowed(brandId){
         const index = this.followedBrands.indexOf(brandId);
         if(index>-1)
         {
             this.followedBrands.splice(index, 1);
         }
         else {
             console.error(`Error: not found; Failed to remove brandId ${brandId} from user's followedBrands`);
         }
        }
    }
}