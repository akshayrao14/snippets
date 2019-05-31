# serviceUsersPhonemailHandler
#
# An SQS queue triggers this lambda and sends it message(s) with payloads
# to perform operations on a DynamoDB table.
#
# Note: Assumed architecture: there will be 2 queues - one for production and 
#       one for staging. They will both call the same lambda code. 
#       The destination table will be decided within this function
#       based on whether the source is a production queue or not.
#
# Akshay Rao - 31/5/2019
# Latest version at: https://github.com/akshayrao14/snippets/blob/master/aws/lambda/ruby/sqs_to_dynamodb.rb

# References
# 1. https://www.honeybadger.io/blog/using-ruby-on-aws-lamba/
# 2. https://medium.com/@PaulDJohnston/how-to-do-queues-in-aws-lambda-f66028cc7f13
# 3. https://docs.aws.amazon.com/sdk-for-ruby/v3/api/Aws/DynamoDB/Client.html

# TODO: As on 31/5/2019
# 1. Process unprocessed_items from ddb_resp
# 2. Use dead letter queue for the failures
# 3. Add timestamp to the table item and to the table schema  ---- DONE
# 4. Handle deletions                                         ---- DONE

require 'aws-sdk-dynamodb'

DDB_CLIENT = Aws::DynamoDB::Client.new(:region => ENV['TABLE_REGION'])

def lambda_handler(event:, context:)

  puts '--EVENT------------------------'
  puts event
  puts '-------------------------------'

  # event payload expectation: https://pastebin.com/rLvn3xyH
  payloads = {
    # Intended structure:
    #   TABLE_NAME_1 => [PAYLOAD1, PAYLOAD2],
    #   TABLE_NAME_2 => [PAYLOAD1, PAYLOAD2]
  }
  
  event['Records'].each do |record|
    src_queue_name = record['eventSourceARN'].split(':').last
    dest_table_name = (src_queue_name == ENV['PRODUCTION_QUEUE']) ? ENV['PRODUCTION_TABLE'] : ENV['STAGING_TABLE']

    if blank?(dest_table_name)
      log_this(:warn, "No matching table given for source queue #{src_queue_name}")
      next
    end

    #################################################################
    # Input checks
    attrb = record['messageAttributes']
    
    log_this(:fatal, 'messageAttributes is empty!') && next if blank?(attrb)
    log_this(:fatal, 'ddb_op is empty!') && next            if blank?(attrb['ddb_op'])
    log_this(:fatal, 'phonemail is empty!') && next         if blank?(attrb['phonemail'])
    
    ddb_op = attrb['ddb_op']['stringValue']
    log_this(:fatal, 'old_phonemail is empty!') && next     if ddb_op == 'replace' && blank?(attrb['old_phonemail'])
    log_this(:fatal, 'id is empty!') && next                if ddb_op != 'delete' && blank?(attrb['id'])
    #################################################################
    
    # PAYLOAD GENERATION
    case ddb_op.to_s.downcase
      when 'put'
        op_payloads = [ gen_put_request(attrb) ]
      when 'delete'
        op_payloads = [ gen_del_request(attrb['phonemail']['stringValue']) ]
      when 'replace'
        op_payloads = [ gen_put_request(attrb), gen_del_request(attrb['old_phonemail']['stringValue']) ]
      else
        log_this(:warn, "Invalid DynamoDB operation: #{ddb_op}")
        op_payloads = []
      end

    unless blank?(op_payloads)
      payloads[dest_table_name] ||= []
      payloads[dest_table_name].push(*op_payloads)
    end
  end
  
  if blank?(payloads)
    log_this(:warn, 'No valid items found')
    return {statusCode: 200, body: 'No valid items found'}
  end
  
  #################################################################

  # Sending payload to DynamoDB
  ddb_resps = {}
  payloads.each_pair do |dest_table_name, items|
    ddb_resps[dest_table_name] ||= []
    
    log_this(:info, "#{dest_table_name}\tItem Count: #{items.count}")
    
    ddb_resps[dest_table_name].push(DDB_CLIENT.batch_write_item({
      :request_items => {
        dest_table_name.to_s => items
      },
      :return_consumed_capacity => "INDEXES",
      :return_item_collection_metrics => "SIZE",
    }))
  end

  #################################################################
  
  puts '--DynamoDB Response------------'
  log_this(:debug, ddb_resps.to_s)
  puts '--EVENT------------------------'
  
  { statusCode: 200, body: ddb_resps.to_s }
end

def blank?(value)
  value.nil? || value.empty?
end

def log_this(type, msg)
  puts [type.to_s.upcase, msg].join("\t")
end

def gen_put_request(attrb)
  {
    :put_request => {
      :item => {
        "phonemail" => attrb['phonemail'] && attrb['phonemail']['stringValue'],
        "svc_mongo" => attrb['id'] && attrb['id']['stringValue'],
        "time"      => (attrb['time'] && attrb['time']['stringValue']) || Time.now.to_f,
      }
    }
  }
end

def gen_del_request(phonemail)
  {
    :delete_request => {
      :key => {
        "phonemail" => phonemail
      }
    }
  }
end
