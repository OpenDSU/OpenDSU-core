/* The concept of a modeled account allows for the depositing of funds into the account,
the withdrawal of money from the account, as well as the structuring of loans between accounts with a fixed daily interest rate.
  However, it is set up in such a way that withdrawals are not possible as long as the account has outstanding debts. */
module.exports = {
    ctor: function(usedID){
        this.usedID = usedID;
        this.balance = 0;
        this.loans = [];

    },
    actions:{
        deposit: function(amount){
            this.balance += amount;
        },
        withdraw: function(amount){
            if(this.balance - this.loanedAmount >= amount){
                this.balance -= amount;
            } else {
                throw new Error("Assert failed: balance should be greater than or equal to amount");
            }
        },
        loan: function(amount, dailyInterestRate, loanerId){
            if(this.balance >= amount){
                let loaner = this.session.lookup(loanerId);
                if(loaner.loanedAmount == undefined) {
                    loaner.loanedAmount = amount;
                    loaner.dailyInterestRate = dailyInterestRate;
                    loaner.lenderId = this.usedID;
                    loaner.lendedTimestamp = this.session.now();
                    this.loans.push(loanerId);
                    this.balance -= amount;
                    loaner.balance += amount;
                } else {
                    throw new Error("Assert failed: loaner should not have an outstanding loan");
                }
            } else {
                throw new Error("Assert failed: balance should be greater than or equal to amount");
            }
        },
        payLoan: function(amount){
            let lender = this.session.lookup(this.lenderId);
            /* compute interest using the number of days and then add interest for each passed day for the amount that is returned*/
                let now = this.session.now();
                let days = Math.floor((now - this.lendedTimestamp) / (1000 * 60 * 60 * 24));
                let interest = days * this.dailyInterestRate * this.loanedAmount;

            if(lender != undefined){
                if(amount < this.balance){
                    this.balance -= amount;
                    lender.balance += amount;
                    this.loanedAmount -= amount;
                    this.loanedAmount += interest;
                }
                if(this.loanedAmount < 0){
                    lender.balance += this.loanedAmount; /* get back money that were wrongfully returned in the previous step*/
                    this.balance -= this.loanedAmount;
                    this.loanedAmount = 0;
                }
                /* if the loaner has no more money to give, it gets removed from the list of loans of the lender*/
                if(this.loanedAmount == 0){
                    this.lenderId = undefined;
                    this.dailyInterestRate = undefined;
                    this.lendedTimestamp = undefined;
                    let index = lender.loans.indexOf(this.usedID);
                    if(index > -1){
                        lender.loans.splice(index, 1);
                    }
                }
            }
        }
    },
    getTotalDebt: function(){
        let interest = 0;
        let now = this.session.now();
        let days = Math.floor((now - this.lendedTimestamp) / (1000 * 60 * 60 * 24));
        interest = days * this.dailyInterestRate * this.loanedAmount;
        return this.loanedAmount + interest;
    }
}