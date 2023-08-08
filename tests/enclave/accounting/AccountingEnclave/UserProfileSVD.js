module.exports = {
    ctor: function (userId) {
        this.userId = userId;
        this.availableInvitesCounter = 0;
        this.acceptedInvites = [];
        this.followedBrands= [];
        /* the email and phone are private by default */
        this.isPrivate = true;
        this.friends = [];
    },
    read: function (){
        return this.getState();
    },
    actions: {
        update: function (name, email, phone, publicDescription, isPrivate) {
            this.name = name;
            this.email = email;
            this.phone = phone;
            this.publicDescription=publicDescription;
            this.isPrivate = isPrivate;
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