import {ApolloLink, Observable} from "apollo-link"

class PusherLink extends ApolloLink {
  constructor(options) {
    super()
    // Retain a handle to the Pusher client
    this.pusher = options.pusher
  }

  request(operation, forward) {
    return new Observable((observer) => {
      // Check the result of the operation
      forward(operation).subscribe({ next: (data) => {
        // If the operation has the subscription header, it's a subscription
        const subscriptionChannel = this._getSubscriptionChannel(operation)
        if (subscriptionChannel) {
          // This will keep pushing to `.next`
          this._createSubscription(subscriptionChannel, observer)
        }
        else {
          // This isn't a subscription,
          // So pass the data along and close the observer.
          observer.next(data)
          observer.complete()
        }
      }})
    })
  }

  _getSubscriptionChannel(operation) {
    const response = operation.getContext().response
    // Check to see if the response has the header
    const subscriptionChannel = response.headers.get("X-Subscription-ID")
    return subscriptionChannel
  }

  _createSubscription(subscriptionChannel, observer) {
    const pusherChannel = this.pusher.subscribe(subscriptionChannel)
    // Subscribe for more update
    pusherChannel.bind("update", function(payload) {
      if (!payload.more) {
        // This is the end, the server says to unsubscribe
        pusher.unsubscribe(subscriptionChannel)
        observer.complete()
      }
      const result = payload.result
      if (result) {
        // Send the new response to listeners
        observer.next(result)
      }
    })
  }
}

export default PusherLink
